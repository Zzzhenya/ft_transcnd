# all: 
# 	npm run start

# fclean:
# 	rm -rf dist

all: run

run: build
	docker run api-gateway:latest

build:
	docker build -t api-gateway ./

debug: build
	docker run -it -v api-gateway:latest /bin/bash

start: run

stop:
	docker ps
	docker stop api-gateway:latest
