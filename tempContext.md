=>The product data should include features these features include products popularity , its category and other relevant features that can be used to recommend it to someone how has joined your platform for the first time ! Although we can start with these features but these features need to change periodically

## Add checkout page
Add products which user has selected to buy in its order table,so it can be used in recommendation service

## Edit Homepage,cart and for you section: have to show show these pages when user is not signed in
Add conditional rendering on the basis of clerk's user object !

## Add social sync : chat feature !
- Feature: Implement frontend to backend connection file = I have backend implementation ready which sets up the server for web socket now I need frontend setup for connecting my frontend to backend web socket. I am thinking of a file which establishes the connection sends requried auth token whenever necessary. Also it should give functions which I can directly use in my **groupchat component** to send/recieve messages. But generate only required and reusable functions no "over-engineering". In frontend I use react with vite+typescript. Only generate the above mentioned file you don't have to implement any other files. Server.js and group chat component is already complete. For your reference I am attaching backend code snippet so you can design the file with better context.
- Fix server.js: fix the web socket auth
- Fix: Change groupchat component, add loading state while data is being fetched from BE
- Feature: Share cart among users: Increase the width of chat component
- add rate limitting on sending messages

## Integrate chatbot

## Manage All types of typescript in a single file

