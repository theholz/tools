FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for TA-Lib, build tools, and Node.js for supergateway
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    tar \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install TA-Lib C library (required for ta-lib Python package)
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xvzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib ta-lib-0.4.0-src.tar.gz

# Install supergateway globally
RUN npm install -g supergateway

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy source code
COPY src/ src/

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Environment variables
ENV PYTHONUNBUFFERED=1

# Expose supergateway port
EXPOSE 8000

# Run supergateway with optional auth token
CMD ["/app/entrypoint.sh"]
