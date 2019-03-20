.PHONY: all build start test

all: build

build:
	yarn
	cd packages/arfe && make
	cd packages/poodle-service && make
	cd packages/poodle-core && make
	cd packages/poodle-electron && yarn && make

start: build
	cd packages/poodle-electron && yarn start

test:
	cd packages/poodle-core && yarn test
	cd packages/poodle-electron && yarn test
