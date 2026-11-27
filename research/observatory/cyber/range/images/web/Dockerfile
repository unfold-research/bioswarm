# R0 web host: nginx serving green HTTP; the app reads db (green behaviour wired by the driver, M2).
FROM r0-base:m1
RUN apt-get -qq update && apt-get -qq install -y --no-install-recommends nginx >/dev/null && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /var/lib/nginx /var/log/nginx /run \
 && chown -R svc:svc /var/lib/nginx /var/log/nginx /etc/nginx /var/www/html /run \
 && printf 'server { listen 8080; location / { return 200 "r0-web ok\\n"; } }\n' > /etc/nginx/sites-available/default
