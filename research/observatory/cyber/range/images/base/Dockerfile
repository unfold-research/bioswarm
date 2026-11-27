# R0 base: the common service host (Debian + non-root sshd + service account). No secrets, no keys baked in; the
# harness mounts host keys, authorized_keys and the maintenance volume at pod start. No red content here.
FROM debian:12-slim@sha256:734a72b3d6142a71993b4bc580ca01d8ca687f77a2c422d96a961d3376b179bc
RUN apt-get -qq update && apt-get -qq install -y --no-install-recommends \
      openssh-server openssh-client openssh-sftp-server procps iproute2 ca-certificates >/dev/null \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -m -u 1000 -s /bin/sh svc \
 && install -d -o svc -g svc /home/svc/sshd /home/svc/.ssh
# sshd as the service user, high port, key auth only, host key + authorized_keys read from the mounted pod dir
COPY sshd_config /home/svc/sshd/sshd_config
RUN chown -R svc:svc /home/svc
