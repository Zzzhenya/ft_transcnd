```bash
tree -I "docs|node_modules"
```
.
├── backend
│   ├── db
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── src
│       ├── app.js
│       ├── controllers
│       │   └── authController.js
│       ├── middlewares
│       │   └── authMiddleware.js
│       ├── models
│       │   └── User.js
│       ├── routes
│       │   └── authRoutes.js
│       ├── services
│       │   └── authService.js
│       └── utils
│           └── database.js
├── docker-compose.yml
├── frontend
│   ├── build
│   │   ├── asset-manifest.json
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   └── static
│   │       ├── css
│   │       │   ├── main.01d8ac04.css
│   │       │   └── main.01d8ac04.css.map
│   │       └── js
│   │           ├── main.b5c6d0e9.js
│   │           ├── main.b5c6d0e9.js.LICENSE.txt
│   │           └── main.b5c6d0e9.js.map
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── public
│   │   ├── favicon.ico
│   │   └── index.html
│   └── src
│       ├── App.css
│       ├── App.js
│       ├── assets
│       │   ├── images
│       │   └── sounds
│       ├── components
│       │   ├── auth
│       │   │   ├── Login.js
│       │   │   └── Register.js
│       │   ├── chat
│       │   │   ├── ChatRoom.js
│       │   │   └── MessageList.js
│       │   ├── common
│       │   │   ├── Footer.js
│       │   │   ├── Header.js
│       │   │   └── ProtectedRoute.js
│       │   ├── game
│       │   │   ├── GameLobby.js
│       │   │   ├── Leaderboard.js
│       │   │   └── PongGame.js
│       │   ├── Home.js
│       │   └── profile
│       │       ├── EditProfile.js
│       │       └── Profile.js
│       ├── contexts
│       │   ├── AuthContext.js
│       │   └── GameContext.js
│       ├── index.js
│       ├── routes.js
│       ├── services
│       │   ├── authService.js
│       │   ├── chatService.js
│       │   ├── gameService.js
│       │   └── userService.js
│       ├── styles
│       │   ├── components
│       │   │   ├── Home.css
│       │   │   ├── Login.css
│       │   │   └── Register.css
│       │   └── global.css
│       └── utils
│           ├── axiosConfig.js
│           └── helpers.js
└── Orga
    ├── raw_files
    └── used_tree

32 directories, 56 files