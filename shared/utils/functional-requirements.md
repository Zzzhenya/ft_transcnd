Requirements based on Subject Version: 18.0

# Users:
    Unregistered Users
    Registered Users

# User Access Management

## Account Management

* [001] User securely register for an account - using email and password? - manage duplicate emails

* [002] Registered users can login

## Profile

* [004] User can view their information

* [005] User can update their information

* [006] User can upload an avatar with a default avatar when none provided

## Friends

* [007] Add friends - using email? - using display names from played games/torunaments?

* [008] Display friends - Persistant friend lists

## Match history and stats

* [009] Display user profile - persistant game stats of that user (summary) - wins vs losses

* [010] Logged in user can view their match history - participated tournament history? 1v1 games, date, game details

# Pong Gameplay

## Local Live Pong Game

* [Core 01] Play a live pong game on the website with a friend using the same keyboard - registered and un-registered users

## Tournament Mode

* [Core 02] Play games in a tournament where there are multiple matches - registered and un-registered users

* [Core 04] Display tournament details - who vs whom and order of play - registered and un-registered users

## Tournament registration

* [Core 03] Must enter unique alias (display name - unique to tournament?) for each trounament - alias - registered and un-registered users

* [Core 05] Reset alias(display name) at the end of a tournament - registered and un-registered users

* [003] For registered users [Core 03] + select unique display name to participate in tournament + User's aliases are linked to account - Manage duplicate aliases

## Fair Game Play

* [Core 07] All players play with same rules. identical paddle speeds - registered and un-registered users

* [Core 08] Follow original Pong game logic - registered and un-registered users

# Matchmaking

* [Core 06] matchmaking system - organize the tournament and matches, announce the next match - registered and un-registered users


-- Modules

## Remote User Authentication

* Allow remote users to login securely using OAuth 2.0

## Remote players

* Players login from two different computers and play the same Pong game

## Server Side Pong with API

* Pong logic in the backend

* REST/WebSocket API to send and receive real time updates - API endpoints to support game initialization, player controls, and game state updates

* Client side support to receieve and show/render data received - responsive

* CLI?

## Live Chat??

## Multiple language support

# Non-functional requirements

## Core 

* [Core 51]Protection against SQL injections/XSS attacks

* [Core 52]Hashed passwords with strong hashing algo

* [Core 53]HTTPS connections

* [Core 54]Form and user input validations in the backend

* [Core 55] secure routes

## Implement JWT and Two-Factor Authentication (2FA) 

* User provide secondary verification method - Implement Two-Factor Authentication (2FA) - OTP?

* Use JSON Web Tokens (JWT) to authenticate and authenticate and authorize user for secure sessions and resource management

* JWT tokens are issued and validated securely

* User-friendly 2FA setup process - SMS codes/ authenticator apps/ email based verification
 
## Log Management - Infrastructure Setup with ELK 

* Collect, process, and transform log data by  Logstash and send to ES

* store and index log data on Elasticsearch

* easily search and access log data on ES

*  Visualizing log data using Kibana - create dashboards, and generate insights from log events

* Define data retention and archiving policies for log data

* Security measures to protect log data and access to the ELK stack components

## Monitoring system - Prometheus Grafana

## Implementing Advanced 3D Techniques - Babylon.js











