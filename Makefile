.PHONY: all build clean start node_modules
.ONESHELL:

all: build

build: node_modules
	export PATH="../../node_modules/.bin:$$PATH"
	cd packages/poodle-electron && yarn install && $(MAKE)

clean:
	$(MAKE) -C packages/poodle-electron clean

start: build
	export PATH="../../node_modules/.bin:$$PATH"
	cd packages/poodle-electron && yarn start

node_modules: package.json
	yarn install
