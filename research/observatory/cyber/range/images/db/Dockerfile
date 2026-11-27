# R0 db host: PostgreSQL with synthetic rows (loaded by the driver, M2). Runs as the service user.
FROM r0-base:m1
RUN apt-get -qq update && apt-get -qq install -y --no-install-recommends postgresql postgresql-client >/dev/null && rm -rf /var/lib/apt/lists/* \
 && install -d -o svc -g svc /home/svc/pgdata
