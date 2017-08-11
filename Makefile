.PHONY: all build clean start node_modules

all: build

build: node_modules
	cd packages/poodle-electron && yarn install && $(MAKE)

clean:
	$(MAKE) -C packages/poodle-electron clean

start: build
	cd packages/poodle-electron && yarn start

node_modules: package.json
	yarn install
