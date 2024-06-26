![Wordle+](https://raw.githubusercontent.com/MikhaD/wordle/main/public/img/og_1200x630.png)
<div align="center">
  <a href="https://craig382.github.io/wordle/" ><img src="https://github.com/craig382/wordle/workflows/Publish/badge.svg?branch=main" alt="Publish workflow"/></a>
  <img src="https://img.shields.io/github/package-json/v/craig382/wordle" alt="GitHub package.json version" />
</div>

---

# Craig Veiner's Notes

### Thank You Mikha Davids
- This is a fork of Mikha Davids' Wordle+ repository at https://github.com/MikhaD/wordle hosted on GitHub pages [here](https://mikhad.github.io/wordle/).

### Craig's Forked Version
- Hosted on GitHub pages [here](https://craig382.github.io/wordle/).

### To run a svelte app...
- Open a terminal in the app's root folder.
- npm install // one time install of svelte dependencies
- npm run dev // gives link to run and debug app in html browser
- In Brave, select menu "More tools > Development tools Ctrl+Shift+I" to open the Development tools panel, which can be floating or docked to the right side. Use the "Console" tab to see "console.log(variable)".

### To publish a svelte app to github...
- The original publish.yml .github workflow was not working.
- Thus, I used the first method ("Vite.config.js outDir build option") from an article entitled "Two Easy Ways to Publish Your Svelte Project on GitHub Pages" at https://medium.com/mkdir-awesome/two-easy-ways-to-publish-your-svelte-project-on-github-pages-c8eaca2b6225
- The steps are...
- One time. In vite.config.js, add the "outDir: './docs'," line and comment out the "dir: './dist'," line.
- One time. In the GitHub wordle repro, open "Settings", select "Pages" from the side bar, in the "Build and deployment" section, ensure (change as needed) "Source" is "Deploy from Branch", "Branch" is "main" with folder "/docs" and click the "Save" button next to "/docs".
- Every time. Update the version number in package.json.
- Every time. run "npm run build" in the Code - OSS (open source vs code) terminal. This updates the compiled code in the /docs folder.
- Everytime a change to the "main" branch is pushed to (synchronized with) the GitHub repro, the app is re-built and re-deployed. It takes a few minutes to build and deploy, and you can watch the build and deploy progress in the GitHub "Actions" tab.

### To run the hidden "Reset your stats" function...
- Click on the Wordle+ Settings icon (the gear icon).
- Hover your mouse over the words "Infinite word #xyz" in the bottom right corner of the window and the following message will pop up: "double click to reset your stats".
- Keeping your mouse in the same place, double click your mouse.
- The following message will briefly pop up: "localStorage cleared".
- All your stats will be erased, and you will be able to play any game number that you have already played from the beginning, with new guesses.

### AI Mode
- AI Mode is a new mode.
- The original modes are Daily, Hourly, and Infinite.
- To enter AI mode, click on "WORDLE+" in the header to switch modes until the temporary mode pop up displays "AI Mode".
- In AI mode, click "New Word" for a new random word or type in the word yourself, then click "Solve" to see the Bot solve the Wordle game.
- BOXER is a challenging AI Mode test case. Especially for the "hard" AI Mode algorithms, BOXER often cannot be solved in 6 guesses.


### Solver Mode
- Solver Mode is a new mode.
- To enter Solver mode, click on "WORDLE+" in the header to switch modes until the temporary mode pop up displays "Solver Mode".
- In Solver mode, the Bot helps you solve an external Wordle (a Wordle you are playing somewhere else).
- In Solver mode, enter the guess letters, then before clicking on "Enter", click on each letter as needed to change the letter's color.

### Row Hints
- Click on "Row Hints" to toggle the row hints ON and OFF.
- Each Row Hint shows the % groups created by the human H (hard) or E (easy) guess over the % groups created by the bot, and W words remaining after the human guess.

### BOT RESULTS Table on the Stats Screen
- Click on the column algorithm title (e.g. "Human" or "Bot Max % Groups Easy") in the Stats screen BOT RESULTS table to change the results in that column to another algorithm.

### Mikha Davids' original ReadMe.md continues below.

# Wordle Overview
A recreation of the popular game [Wordle](https://www.nytimes.com/games/wordle/) by Josh Wardle (now purchased by the New York Times), with additional modes and features.

# Additional Features
- Words are chosen from the list of words at random instead of in sequence, and the solution is not stored in localStorage, making it harder to cheat. The seed for the random number is created from the date, ensuring that everyone gets the same random number, so people can still compare answers.
- When you complete a game the definition of the word is shown on the end of game modal.
- In addition to the other statistics, your average guesses and your losses are also displayed on the win modal.
- When the timer reaches 0 for a given game mode it changes into a refresh button instead of just staying at 00:00:00.
- A tips widget in the settings menu with useful information about the functionality of the game.
- Right clicking a submitted word on the board will tell you its definition.
- Right clicking a submitted word on the board will tell you how many possible words could have been played there, taking all previous information into account.
- The game mode is reflected in the url, allowing you to share a game mode directly.
- You can share a link to a specific game number, allowing you to play historical games, and share specific rounds of the faster changing modes with your friends.
- You can access previous games from the settings menu by inputting a game number or link.
- Service worker which allows the game to be easily downloaded as a progressive web app and run offline.
- Give Up button.

## Additional modes
The game mode can be changed by clicking WORDLE+ at the top of the screen or swiping the board in either direction.

**Hourly mode**: A new word every hour.

**Infinite mode**: A new word every time you refresh, for the true addicts.

# Technical details
This is written with Svelte in Typescript. This is my first Svelte project, and is intended as an exercise to help me learn and become proficient in Svelte. It also uses some basic scss for styling.

The project was initialized using `npm init vite@latest` and selecting the Svelte template.

# Forking this project
Anybody is welcome to fork this repository and do what they like with it, provided they follow the accompanying license (GPL-3.0).
I would also appreciate if you could link back to this repository and credit me in your project.

Have fun :)

<details>
<summary>How to create a new mode</summary>

- Add the mode name to the **end** of the GameMode enum in `enums.ts`
- Add a case for that mode in the newSeed function in `utils.ts`
- Add a ModeData object to the modeData modes array in `utils.ts`
</details>
