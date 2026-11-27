FROM python:3.11-slim
RUN pip install --no-cache-dir typing_extensions==4.9.0 PyYAML==6.0.1 gym==0.26.2 gymnasium==0.28.1 pettingzoo==1.24.3 prettytable==3.9.0 networkx==3.2.1 numpy==1.26.4 paramiko==3.4.0 rich pygame==2.5.2 matplotlib==3.8.2
# Build context: a clone of cage-challenge/cage-challenge-4 at 8c3c50ca54b176c2de199847944e8dcc035497e3 next to this file.
COPY cage-challenge-4 /opt/cage
RUN pip install --no-cache-dir --no-deps -e /opt/cage
COPY stub /opt/stub
ENV PYTHONPATH=/opt/stub
WORKDIR /work
