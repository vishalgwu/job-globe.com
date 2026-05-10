"""Abstract base class for all job source connectors.

Design principles:
- Every connector is stateless and produces a list of RawJobEvent objects.
- Credentials are injected via the connector's constructor from WorkerSettings.
- Connectors declare whether they are configured (have valid credentials /
  company lists).  The runner skips unconfigured connectors gracefully.
- Retry logic with exponential back-off is provided here so individual
  connectors do not re-implement it.
- All HTTP is done through a shared httpx.Client (not async — worker threads
  handle concurrency at the process level).
"""

from __future__ import annotations

import abc
import time
from collections.abc import Iterator

import httpx
import structlog

from job_globe_workers.settings import WorkerSettings, settings

logger = structlog.get_logger(__name__)

# Default headers sent with every outbound request.
_BASE_HEADERS = {
    "User-Agent": "job-globe-worker/1.0 (+https://job-globe.com)",
    "Accept": "application/json",
}


class ConnectorError(Exception):
    """Non-retriable connector failure (bad credentials, unknown format, …)."""


class RateLimitError(Exception):
    """Source returned HTTP 429 — caller should back off."""


def _build_client(timeout: float) -> httpx.Client:
    return httpx.Client(
        headers=_BASE_HEADERS,
        timeout=timeout,
        follow_redirects=True,
    )


class AbstractConnector(abc.ABC):
    """Base class that all source connectors must inherit from.

    Subclasses must implement:
        name        — unique snake_case source identifier
        is_configured() — returns True when required credentials are present
        fetch()     — generator that yields raw dicts from the source API

    The base class provides:
        fetch_with_retry()  — wraps fetch() with retries + back-off
        _get() / _post()    — authenticated HTTP helpers with retry logic
    """

    # Override in subclass with the canonical source name (matches jobs_raw.source)
    name: str = "unknown"

    def __init__(self, cfg: WorkerSettings = settings) -> None:
        self._cfg = cfg
        self._client: httpx.Client | None = None

    @property
    def _http(self) -> httpx.Client:
        """Lazy HTTP client — created on first use so tests can instantiate
        connectors without triggering proxy/network detection."""
        if self._client is None:
            self._client = _build_client(self._cfg.http_timeout_seconds)
        return self._client

    # ── Public API ─────────────────────────────────────────────────────

    @abc.abstractmethod
    def is_configured(self) -> bool:
        """Return True when all required credentials / config are present."""
        ...

    @abc.abstractmethod
    def fetch(self) -> Iterator[dict]:
        """Yield raw job dicts from the source.

        Each dict must contain at minimum:
            source_job_id: str
            source_url:    str   (canonical link on source site)
            apply_url:     str   (deeplink to apply form)
            title:         str
            company_name:  str
            location_raw:  str
            description:   str
        """
        ...

    def fetch_with_retry(self) -> Iterator[dict]:
        """Wrap fetch() with retry logic.  Yields items as they arrive."""
        attempt = 0
        while True:
            try:
                yield from self.fetch()
                return
            except RateLimitError:
                delay = self._backoff(attempt)
                logger.warning(
                    "connector.rate_limited",
                    source=self.name,
                    attempt=attempt,
                    retry_in=delay,
                )
                time.sleep(delay)
                attempt += 1
            except ConnectorError as exc:
                logger.error("connector.error", source=self.name, error=str(exc))
                return
            except Exception as exc:  # noqa: BLE001
                if attempt >= self._cfg.http_max_retries:
                    logger.error(
                        "connector.exhausted",
                        source=self.name,
                        attempt=attempt,
                        error=str(exc),
                    )
                    return
                delay = self._backoff(attempt)
                logger.warning(
                    "connector.retrying",
                    source=self.name,
                    attempt=attempt,
                    retry_in=delay,
                    error=str(exc),
                )
                time.sleep(delay)
                attempt += 1

    # ── HTTP helpers ───────────────────────────────────────────────────

    def _get(self, url: str, **kwargs) -> httpx.Response:  # type: ignore[no-untyped-def]
        """GET with retry and rate-limit handling."""
        return self._request("GET", url, **kwargs)

    def _post(self, url: str, **kwargs) -> httpx.Response:  # type: ignore[no-untyped-def]
        """POST with retry and rate-limit handling."""
        return self._request("POST", url, **kwargs)

    def _request(self, method: str, url: str, **kwargs) -> httpx.Response:  # type: ignore[no-untyped-def]
        attempt = 0
        while True:
            try:
                resp = self._http.request(method, url, **kwargs)
                if resp.status_code == 429:
                    raise RateLimitError(f"429 from {url}")
                resp.raise_for_status()
                return resp
            except RateLimitError:
                raise
            except httpx.HTTPStatusError as exc:
                if attempt >= self._cfg.http_max_retries:
                    raise ConnectorError(str(exc)) from exc
                time.sleep(self._backoff(attempt))
                attempt += 1
            except httpx.RequestError as exc:
                if attempt >= self._cfg.http_max_retries:
                    raise ConnectorError(str(exc)) from exc
                time.sleep(self._backoff(attempt))
                attempt += 1

    def _backoff(self, attempt: int) -> float:
        """Exponential back-off: factor * 2^attempt, capped at 60 s."""
        return min(self._cfg.http_backoff_factor * (2**attempt), 60.0)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} source={self.name!r}>"
