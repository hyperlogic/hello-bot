say $1 -o greeting.aiff
sox -c 1 greeting.aiff greeting_$2.wav rate 48k
rm greeting.aiff
