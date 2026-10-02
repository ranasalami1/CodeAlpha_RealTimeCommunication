# Real-Time Communication App

A secure real-time video conferencing and collaboration application built as part of the **CodeAlpha Full Stack Development Internship**.

The platform allows authenticated users to create or join meeting rooms, communicate through live video and audio, share their screens and files, and collaborate using a real-time whiteboard.

## Features

- User registration and login
- Secure Django authentication
- Create private meeting rooms
- Join meetings using a unique room code
- Multi-user video calling
- Real-time audio communication
- Microphone mute / unmute
- Camera on / off
- Screen sharing
- Peer-to-peer file sharing
- Real-time collaborative whiteboard
- Drawing and writing on the whiteboard
- Clear whiteboard for connected participants
- Firebase authentication using Django custom tokens
- Protected Firestore security rules
- Responsive professional interface

## Technologies Used

### Backend
- Python
- Django
- SQLite
- Firebase Admin SDK

### Frontend
- HTML5
- CSS3
- JavaScript

### Real-Time Communication
- WebRTC
- WebRTC Data Channels
- Firebase Cloud Firestore

## Security

The project uses:

- Django authentication
- Django password hashing
- Firebase Custom Token Authentication
- Firestore Security Rules
- WebRTC encrypted communication

The Firebase service-account key is excluded from Git using `.gitignore`.

## Installation

Clone the repository:

```bash
git clone https://github.com/ranasalami1/CodeAlpha_RealTimeCommunication.git