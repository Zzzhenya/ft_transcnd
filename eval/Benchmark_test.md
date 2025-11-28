$ hey -n 10000 -c 100 https://localhost:8443
========================================================================================

Summary:
  Total:        0.4196 secs
  Slowest:      0.1176 secs
  Fastest:      0.0003 secs
  Average:      0.0040 secs
  Requests/sec: 23833.6704
  
  Total data:   17970000 bytes
  Size/request: 1797 bytes

Response time histogram:
  0.000 [1]     |
  0.012 [9666]  |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  0.024 [133]   |■
  0.035 [59]    |
  0.047 [35]    |
  0.059 [54]    |
  0.071 [23]    |
  0.082 [13]    |
  0.094 [3]     |
  0.106 [7]     |
  0.118 [6]     |


Latency distribution:
  10% in 0.0011 secs
  25% in 0.0017 secs
  50% in 0.0026 secs
  75% in 0.0039 secs
  90% in 0.0058 secs
  95% in 0.0079 secs
  99% in 0.0488 secs

Details (average, fastest, slowest):
  DNS+dialup:   0.0001 secs, 0.0003 secs, 0.1176 secs
  DNS-lookup:   0.0002 secs, 0.0000 secs, 0.0603 secs
  req write:    0.0002 secs, 0.0000 secs, 0.0518 secs
  resp wait:    0.0028 secs, 0.0002 secs, 0.0491 secs
  resp read:    0.0005 secs, 0.0000 secs, 0.0731 secs

Status code distribution:
  [200] 10000 responses


----

curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

  =======

hey -n 100 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  http://localhost:8080/api/auth/login

-----

hey -n 1000 -c 100 -m POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  http://localhost:8080/api/auth/login

Summary:
  Total:        0.2803 secs
  Slowest:      0.0441 secs
  Fastest:      0.0076 secs
  Average:      0.0275 secs
  Requests/sec: 356.7248
  
  Total data:   20700 bytes
  Size/request: 207 bytes

Response time histogram:
  0.008 [1]     |■
  0.011 [0]     |
  0.015 [3]     |■■■■
  0.019 [5]     |■■■■■■
  0.022 [3]     |■■■■
  0.026 [31]    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  0.030 [28]    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  0.033 [9]     |■■■■■■■■■■■■
  0.037 [4]     |■■■■■
  0.040 [14]    |■■■■■■■■■■■■■■■■■■
  0.044 [2]     |■■■


Latency distribution:
  10% in 0.0216 secs
  25% in 0.0241 secs
  50% in 0.0263 secs
  75% in 0.0310 secs
  90% in 0.0381 secs
  95% in 0.0397 secs
  99% in 0.0441 secs

Details (average, fastest, slowest):
  DNS+dialup:   0.0004 secs, 0.0076 secs, 0.0441 secs
  DNS-lookup:   0.0001 secs, 0.0000 secs, 0.0009 secs
  req write:    0.0001 secs, 0.0000 secs, 0.0010 secs
  resp wait:    0.0266 secs, 0.0050 secs, 0.0437 secs
  resp read:    0.0004 secs, 0.0000 secs, 0.0022 secs

Status code distribution:
  [404] 100 responses


