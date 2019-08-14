b=\e[34m
g=\e[32m
w=\e[97m
n=\e[97m\n

help:
	@echo ''
	@echo 'Commands for CursorEng|ne'
	@echo ''
	@printf '${b}test${n}'
	@printf '    ${g}all${w}                    test all the things'
	@echo ''
	@echo ''

test/all:
	@nyc mocha server/tests/engine