/* R0 selftest and canary helper for gVisor hosts (no NET_RAW there).
   icmpsock              can this process open an ICMP socket? Tries SOCK_RAW and the unprivileged ping socket
                         (SOCK_DGRAM, IPPROTO_ICMP); one line per kind ("raw ok" / "raw denied <errno> <msg>").
                         Exit 0 when neither opens, 1 when one does.
   icmpsock ping IP...   one echo request per IP over the ping socket, all at once (one child each), 2 s to answer;
                         prints "OPEN icmp <ip>" for each reply. Exit 0. Built static so it runs in any range image. */
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <sys/wait.h>
#include <netinet/in.h>
#include <netinet/ip_icmp.h>
static int try(const char *name, int type) {
  int s = socket(AF_INET, type, IPPROTO_ICMP);
  if (s >= 0) { printf("%s ok\n", name); close(s); return 1; }
  printf("%s denied %d %s\n", name, errno, strerror(errno)); return 0;
}
static int ping1(const char *ip) {
  int s = socket(AF_INET, SOCK_DGRAM, IPPROTO_ICMP); if (s < 0) return 1;
  struct timeval tv = { 2, 0 }; setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof tv);
  struct sockaddr_in a; memset(&a, 0, sizeof a); a.sin_family = AF_INET; if (inet_pton(AF_INET, ip, &a.sin_addr) != 1) return 1;
  struct icmphdr h; memset(&h, 0, sizeof h); h.type = ICMP_ECHO; h.un.echo.sequence = htons(1);
  if (sendto(s, &h, sizeof h, 0, (struct sockaddr *)&a, sizeof a) < 0) return 1;
  unsigned char buf[256]; ssize_t n = recv(s, buf, sizeof buf, 0); close(s);
  return (n >= (ssize_t)sizeof h && ((struct icmphdr *)buf)->type == ICMP_ECHOREPLY) ? 0 : 1;
}
int main(int argc, char **argv) {
  if (argc > 1 && !strcmp(argv[1], "ping")) {
    for (int i = 2; i < argc; i++) if (fork() == 0) { if (ping1(argv[i]) == 0) { printf("OPEN icmp %s\n", argv[i]); fflush(stdout); } _exit(0); }
    while (wait(NULL) > 0) {}
    return 0;
  }
  int a = try("raw", SOCK_RAW), b = try("ping", SOCK_DGRAM); return (a || b) ? 1 : 0;
}
