PACKAGES := packages/poodle-core packages/poodle-electron packages/poodle-service packages/redux-slurp

.PHONY: start node_modules $(PACKAGES)

start: node_modules $(PACKAGES)
	cd packages/poodle-electron && yarn install && yarn start

node_modules: package.json
	yarn install

$(PACKAGES):
	$(MAKE) -C "$@"
