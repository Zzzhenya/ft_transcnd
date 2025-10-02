/*
	Manage user's keyboard input.

	leftPaddle: W (up), S (down)
	rightPaddle: ArrosUp (up), ArrowDown (down)
	P: Pause
	R: Reset
*/
// Check input, which key is pushed as.
export type InputState = {
	upLeft: boolean;
	dwLeft: boolean;
	upRight: boolean;
	dwRight: boolean;
	pause: boolean;
	reset: boolean;
};

export function createInput(): { state: InputState; attach(el: Window): () => void } {
  const state: InputState = {
    upLeft: false,
    dwLeft: false,
    upRight: false,
    dwRight: false,
    pause: false,
    reset: false,
  };

  const onKey = (v: boolean) => (e: KeyboardEvent) => {
    switch (e.key) {
      case "w":
      case "W":
        state.upLeft = v;
        break;
      case "s":
      case "S":
        state.dwLeft = v;
        break;
      case "ArrowUp":
        state.upRight = v;
        break;
      case "ArrowDown":
        state.dwRight = v;
        break;
      case "p":
      case "P":
        if (v) state.pause = !state.pause;
        break;
      case "r":
      case "R":
        if (v) state.reset = true;
        break;
    }
  };

  const onKeyDown = onKey(true);
  const onKeyUp = onKey(false);

  const attach = (el: Window) => {
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("keyup", onKeyUp);
    return () => {
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
    };
  };

  return { state, attach };
}
