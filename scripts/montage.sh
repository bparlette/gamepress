#!/bin/sh
# montage.sh <recipe>...: side-by-side of the last headless-test screenshots (.gp/try-<recipe>.test.jpg) -> /tmp/montage.jpg
ins=""; fl=""; n=0
for r in "$@"; do ins="$ins -i .gp/try-$r.test.jpg"; fl="$fl[$n]scale=270:-1[v$n];"; n=$((n+1)); done
st=""; i=0; while [ $i -lt $n ]; do st="$st[v$i]"; i=$((i+1)); done
ffmpeg -loglevel error -y $ins -filter_complex "$fl${st}hstack=$n" /tmp/montage.jpg
