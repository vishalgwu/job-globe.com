from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    database_url: str = Field(default="postgresql://job_globe:job_globe@localhost:5432/job_globe")
    redis_url: str = Field(default="redis://localhost:6379/0")
    discovery_stream: str = Field(default="job-globe.discovery", alias="REDIS_STREAM_DISCOVERY")
    alerts_stream: str = Field(default="job-globe.alerts", alias="REDIS_STREAM_ALERTS")
    embedding_model: str = Field(default="text-embedding-3-small")
    resume_raw_retention_days: int = Field(default=30)


settings = WorkerSettings()
