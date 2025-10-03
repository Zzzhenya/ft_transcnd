/*
	Manage user's keyboard input.
	Check input, which key is pushed as from user.

	leftPaddle: W (up), S (down)
	rightPaddle: ArrowUp (up), ArrowDown (down)
	pause, reset.
*/
export type InputState = {
	upLeft: boolean;
	dwLeft: boolean;
	upRight: boolean;
	dwRight: boolean;
	pause: boolean;
	reset: boolean;
};

export function createInput() {
	const state: InputState = {
	upLeft: false,
	dwLeft: false,
	upRight: false,
	dwRight: false,
	pause: false,
	reset: false,
	};

	// v: value, e: event
	function handleKey(v: boolean, e: KeyboardEvent) {
		const k = e.key;
		switch (k) {
			case "w": case "W":
				state.upLeft = v;
				if (v) e.preventDefault();
				break;
			case "s": case "S":
				state.dwLeft = v;
				if (v) e.preventDefault();
				break;
			case "ArrowUp":
				state.upRight = v;
				if (v) e.preventDefault();
				break;
			case "ArrowDown":
				state.dwRight = v;
				if (v) e.preventDefault();
				break;
			case "p": case "P":
				if (v && !e.repeat)
					state.pause = !state.pause;
				break;
			case "r": case "R":
				if (v && !e.repeat)
					state.reset = true;
				break;
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		handleKey(true, e);
	}

	function onKeyUp(e: KeyboardEvent) {
		handleKey(false, e);
	}

	/*
		Param: 브라우저의 Window객체를 받는다.
		window에서 "keydown(keyup)" 이벤트가 발생하면 [f] onKeyDown(Up) 실행.
		return시 실행했던 이벤트 리스너를 해제한다.
	*/
	function attach(el: Window) {
		el.addEventListener("keydown", onKeyDown);
		el.addEventListener("keyup", onKeyUp);

		// cleanup
		return () => {
			el.removeEventListener("keydown", onKeyDown);
			el.removeEventListener("keyup", onKeyUp);
		};
	}

	return { state, attach };
}
