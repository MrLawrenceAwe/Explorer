from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session, sessionmaker

from .models import Base
from .schema_migrations import ensure_lightweight_schema

def create_engine_from_url(
    database_url: str,
    *,
    echo: bool = False,
    pool_pre_ping: bool = True,
) -> Engine:
    """Create a SQLAlchemy engine configured for modern 2.0 usage."""
    url = make_url(database_url)
    if url.drivername == "sqlite" and url.database and url.database not in {":memory:", None}:
        db_path = Path(url.database.replace("file:", "", 1)).expanduser().resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(
        url,
        echo=echo,
        pool_pre_ping=pool_pre_ping,
        future=True,
    )
    ensure_lightweight_schema(engine)
    return engine


def create_session_factory(
    engine: Engine,
    *,
    expire_on_commit: bool = False,
) -> sessionmaker[Session]:
    """Return a session factory bound to ``engine``."""

    return sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=expire_on_commit,
        future=True,
    )


def create_session_factory_from_env(
    *,
    env_var: str = "EXPLORER_DATABASE_URL",
    default_url: str = "sqlite:///data/reportgen.db",
    echo: bool = False,
    expire_on_commit: bool = False,
) -> sessionmaker[Session]:
    """Build a session factory using env configuration and ensure tables exist."""

    database_url = os.environ.get(env_var, default_url)
    engine = create_engine_from_url(database_url, echo=echo)
    Base.metadata.create_all(engine)
    return create_session_factory(engine, expire_on_commit=expire_on_commit)


@contextmanager
def session_scope(
    session_factory: sessionmaker[Session],
) -> Generator[Session, None, None]:
    """Provide a transactional scope around a series of operations."""

    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
