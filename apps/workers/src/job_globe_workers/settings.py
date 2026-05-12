from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    """Centralised settings for the worker plane."""

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core infrastructure
    database_url: str = Field(
        default="postgresql://job_globe:job_globe@localhost:5432/job_globe"
    )
    redis_url: str = Field(default="redis://localhost:6379/0")

    # Redis stream names
    discovery_stream: str = Field(
        default="job-globe.discovery", alias="REDIS_STREAM_DISCOVERY"
    )
    verification_stream: str = Field(
        default="job-globe.verification", alias="REDIS_STREAM_VERIFICATION"
    )
    canonical_stream: str = Field(
        default="job-globe.canonical", alias="REDIS_STREAM_CANONICAL"
    )
    alerts_stream: str = Field(
        default="job-globe.alerts", alias="REDIS_STREAM_ALERTS"
    )

    # Adzuna
    adzuna_app_id: str = Field(default="", alias="ADZUNA_APP_ID")
    adzuna_app_key: str = Field(default="", alias="ADZUNA_APP_KEY")
    adzuna_countries: str = Field(default="gb,us,au,ca,de,fr", alias="ADZUNA_COUNTRIES")

    # USA Jobs
    usajobs_api_key: str = Field(default="", alias="USAJOBS_API_KEY")
    usajobs_user_agent: str = Field(
        default="job-globe-worker/1.0", alias="USAJOBS_USER_AGENT"
    )

    # EURES
    eures_api_url: str = Field(
        default="https://jobsearch.api.ec.europa.eu/searchengine/rest/esco/v1",
        alias="EURES_API_URL",
    )

    # Greenhouse
    greenhouse_board_tokens: str = Field(default="", alias="GREENHOUSE_BOARD_TOKENS")

    # Lever
    lever_company_slugs: str = Field(default="", alias="LEVER_COMPANY_SLUGS")

    # Workable
    workable_api_token: str = Field(default="", alias="WORKABLE_API_TOKEN")
    workable_company_slugs: str = Field(default="", alias="WORKABLE_COMPANY_SLUGS")

    # SmartRecruiters
    smartrecruiters_company_ids: str = Field(
        default="", alias="SMARTRECRUITERS_COMPANY_IDS"
    )

    # HTTP client
    http_timeout_seconds: float = Field(default=15.0)
    http_max_retries: int = Field(default=3)
    http_backoff_factor: float = Field(default=0.5)

    # AI / embeddings
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    embedding_model: str = Field(default="text-embedding-3-small")
    embedding_dimensions: int = Field(default=1536, alias="EMBEDDING_DIMENSIONS")
    quick_prep_model: str = Field(default="gpt-4o-mini", alias="QUICK_PREP_MODEL")
    quick_prep_cache_ttl_hours: int = Field(default=24, alias="QUICK_PREP_CACHE_TTL_HOURS")
    resume_raw_retention_days: int = Field(default=30)

    # Alert delivery
    resend_api_key: str = Field(default="", alias="RESEND_API_KEY")
    alert_from_email: str = Field(default="alerts@job-globe.com", alias="ALERT_FROM_EMAIL")
    alert_daily_max_per_user: int = Field(default=5, alias="ALERT_DAILY_MAX_PER_USER")
    alert_evaluator_interval_seconds: float = Field(default=300.0)  # 5-minute cadence

    # Webhook security
    greenhouse_webhook_secret: str = Field(default="", alias="GREENHOUSE_WEBHOOK_SECRET")
    lever_webhook_secret: str = Field(default="", alias="LEVER_WEBHOOK_SECRET")

    # Worker concurrency
    worker_poll_interval_seconds: float = Field(default=5.0)
    db_pool_min_size: int = Field(default=2)
    db_pool_max_size: int = Field(default=10)
    worker_health_host: str = Field(default="0.0.0.0", alias="WORKER_HEALTH_HOST")
    worker_health_port: int = Field(default=8080, alias="WORKER_HEALTH_PORT")

    # Redis consumer group settings
    redis_consumer_group: str = Field(default="job-globe-workers", alias="REDIS_CONSUMER_GROUP")
    redis_consumer_name: str = Field(default="worker-0", alias="REDIS_CONSUMER_NAME")
    redis_max_retries: int = Field(default=3, alias="REDIS_MAX_RETRIES")
    redis_dlq_stream_suffix: str = Field(default=".dlq", alias="REDIS_DLQ_STREAM_SUFFIX")

    # Audit retention
    audit_cleanup_interval_hours: int = Field(default=24, alias="AUDIT_CLEANUP_INTERVAL_HOURS")

    @property
    def greenhouse_board_token_list(self) -> list[str]:
        return [t.strip() for t in self.greenhouse_board_tokens.split(",") if t.strip()]

    @property
    def lever_company_slug_list(self) -> list[str]:
        return [s.strip() for s in self.lever_company_slugs.split(",") if s.strip()]

    @property
    def workable_company_slug_list(self) -> list[str]:
        return [s.strip() for s in self.workable_company_slugs.split(",") if s.strip()]

    @property
    def smartrecruiters_company_id_list(self) -> list[str]:
        return [s.strip() for s in self.smartrecruiters_company_ids.split(",") if s.strip()]

    @property
    def adzuna_country_list(self) -> list[str]:
        return [c.strip() for c in self.adzuna_countries.split(",") if c.strip()]


settings = WorkerSettings()
