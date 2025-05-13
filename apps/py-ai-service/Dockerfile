# syntax=docker/dockerfile:1
# -----------------------------------------------------------
# Dockerfile – Diff Worker (Flow-1)
# -----------------------------------------------------------
# This image bundles the minimal Python worker that listens to
# Redis Stream events, computes an HTML diff, and republishes the
# result.  It intentionally stays slim (Python 3.10-slim) so dev
# laptops pull quickly.
# -----------------------------------------------------------

FROM python:3.10-slim AS runtime

# Create a non-root user for security (UID 1000 matches most hosts)
RUN useradd -ms /bin/bash worker

WORKDIR /app

# Copy dependency lock file first for better build-cache hits
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the worker source
COPY . .

# Switch to the least-privileged user
USER worker

# The main script contains the `if __name__ == "__main__"` entry
CMD ["python", "diff_worker.py"] 