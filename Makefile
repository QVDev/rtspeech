dist: 
	bin/build
	cp src/codecs/* public/dist/
	uglifyjs public/dist/app.js > public/dist/app.min.js
	uglifyjs public/dist/deps.js > public/dist/deps.min.js

.PHONY: dist
