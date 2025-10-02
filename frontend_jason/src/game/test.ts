import { DefaultConfig, createState } from "./state";
import { serveBall, resetRound } from "./logic";

const state = createState(DefaultConfig);
console.log("Init statement:", state);

serveBall(state);
console.log("After service:", state);

resetRound(state);
console.log("After reset:", state);
