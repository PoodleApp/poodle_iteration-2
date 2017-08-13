.PHONY: test

test:
	cd packages/poodle-core && yarn test
	cd packages/poodle-electron && yarn test
