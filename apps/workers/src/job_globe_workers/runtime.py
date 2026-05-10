"""Runtime shim -- delegates to main.py.

Kept for backwards compatibility with Dockerfile CMD and existing process
supervisors that may reference this module by name.
"""

from job_globe_workers.main import main

if __name__ == "__main__":
    main()
