import moment from "moment";

// Obsidian provides moment globally. Mock it for tests using the installed package.
(window as any).moment = moment;
