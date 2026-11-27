# R0 router: forwards between the three segments; blue's block/allow rules apply here. runc + NET_ADMIN only.
# conntrack-tools: the socket sensor reads the router's conntrack table for the flows it forwards (M2).
FROM alpine:3.20@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc
RUN apk add --no-cache iproute2 iptables conntrack-tools >/dev/null
