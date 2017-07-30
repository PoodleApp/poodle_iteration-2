.PHONY: start node_modules

start: node_modules
	cd packages/poodle-electron && yarn install && make && yarn start

node_modules: package.json
	yarn install
