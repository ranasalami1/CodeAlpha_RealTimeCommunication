import {
    db,
    firebaseAuthReady
} from "./firebase-config.js";

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// =====================================================
// ROOM INFORMATION
// =====================================================

const roomCode = document.body.dataset.roomCode;
const currentUserId = document.body.dataset.userId;

console.log("Room code:", roomCode);
console.log("Current user:", currentUserId);


// =====================================================
// HTML ELEMENTS
// =====================================================

const localVideo =
    document.getElementById("localVideo");

const remoteVideosContainer =
    document.getElementById("remoteVideos");

const toggleMicButton =
    document.getElementById("toggleMic");

const toggleCameraButton =
    document.getElementById("toggleCamera");

const shareScreenButton =
    document.getElementById("shareScreen");

const cameraError =
    document.getElementById("cameraError");


// File Sharing

const fileInput =
    document.getElementById("fileInput");

const sendFileButton =
    document.getElementById("sendFile");

const fileStatus =
    document.getElementById("fileStatus");

const receivedFiles =
    document.getElementById("receivedFiles");


// Whiteboard

const whiteboard =
    document.getElementById("whiteboard");

const drawModeButton =
    document.getElementById("drawMode");

const textModeButton =
    document.getElementById("textMode");

const clearBoardButton =
    document.getElementById("clearBoard");

const whiteboardStatus =
    document.getElementById("whiteboardStatus");

const ctx =
    whiteboard.getContext("2d");


// =====================================================
// MEDIA
// =====================================================

let localStream = null;
let screenStream = null;


// =====================================================
// WEBRTC
// =====================================================

const peerConnections = {};
const remoteVideos = {};

const activeCallIds = {};
const pendingCandidates = {};

const signalUnsubscribers = {};
const candidateUnsubscribers = {};


// =====================================================
// DATA CHANNEL
// =====================================================

const dataChannels = {};

const incomingFiles = {};


// =====================================================
// WHITEBOARD STATE
// =====================================================

let whiteboardMode = "draw";
let drawing = false;
let lastPoint = null;

let whiteboardHistory = [];

ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.strokeStyle = "black";
ctx.fillStyle = "black";
ctx.font = "20px Arial";

whiteboard.style.touchAction = "none";


// =====================================================
// ICE / STUN
// =====================================================

const servers = {

    iceServers: [

        {
            urls: [
                "stun:stun.l.google.com:19302"
            ]
        }

    ]

};


// =====================================================
// CAMERA + MICROPHONE
// =====================================================

async function startCamera() {

    try {

        localStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

        localVideo.srcObject =
            localStream;

        console.log(
            "Camera and microphone started."
        );

    }

    catch (error) {

        console.error(
            "Camera/Microphone error:",
            error
        );

        cameraError.textContent =
            `${error.name}: ${error.message}`;
    }

}


// =====================================================
// MICROPHONE ON / OFF
// =====================================================

toggleMicButton.addEventListener(
    "click",
    function () {

        if (!localStream) {
            return;
        }

        const audioTrack =
            localStream.getAudioTracks()[0];

        if (!audioTrack) {
            return;
        }

        audioTrack.enabled =
            !audioTrack.enabled;

        if (audioTrack.enabled) {

            toggleMicButton.textContent =
                "Mute Microphone";

            console.log(
                "Microphone ON"
            );

        }

        else {

            toggleMicButton.textContent =
                "Unmute Microphone";

            console.log(
                "Microphone OFF"
            );
        }
    }
);


// =====================================================
// CAMERA ON / OFF
// =====================================================

toggleCameraButton.addEventListener(
    "click",
    function () {

        if (!localStream) {
            return;
        }

        const videoTrack =
            localStream.getVideoTracks()[0];

        if (!videoTrack) {
            return;
        }

        videoTrack.enabled =
            !videoTrack.enabled;

        if (videoTrack.enabled) {

            toggleCameraButton.textContent =
                "Turn Camera Off";

            console.log(
                "Camera ON"
            );

        }

        else {

            toggleCameraButton.textContent =
                "Turn Camera On";

            console.log(
                "Camera OFF"
            );
        }
    }
);


// =====================================================
// SCREEN SHARING
// =====================================================

async function replaceVideoTrackForEveryone(
    newTrack
) {

    for (
        const [userId, peerConnection]
        of Object.entries(peerConnections)
    ) {

        const videoSender =
            peerConnection
                .getSenders()
                .find(
                    sender =>
                        sender.track &&
                        sender.track.kind === "video"
                );

        if (videoSender) {

            await videoSender.replaceTrack(
                newTrack
            );

            console.log(
                "Video track replaced for:",
                userId
            );
        }
    }
}


async function startScreenShare() {

    try {

        screenStream =
            await navigator.mediaDevices.getDisplayMedia({
                video: true
            });


        const screenTrack =
            screenStream.getVideoTracks()[0];


        await replaceVideoTrackForEveryone(
            screenTrack
        );


        localVideo.srcObject =
            screenStream;


        shareScreenButton.textContent =
            "Stop Sharing";


        console.log(
            "Screen sharing started."
        );


        screenTrack.onended =
            async () => {

                await stopScreenShare();
            };

    }

    catch (error) {

        console.error(
            "Screen sharing error:",
            error
        );
    }
}


async function stopScreenShare() {

    if (!localStream) {
        return;
    }


    const cameraTrack =
        localStream.getVideoTracks()[0];


    if (cameraTrack) {

        await replaceVideoTrackForEveryone(
            cameraTrack
        );
    }


    if (screenStream) {

        screenStream
            .getTracks()
            .forEach(
                track => {

                    track.onended = null;

                    track.stop();
                }
            );

        screenStream = null;
    }


    localVideo.srcObject =
        localStream;


    shareScreenButton.textContent =
        "Share Screen";


    console.log(
        "Screen sharing stopped."
    );
}


shareScreenButton.addEventListener(
    "click",
    async function () {

        if (screenStream) {

            await stopScreenShare();

        }

        else {

            await startScreenShare();
        }
    }
);


// =====================================================
// REMOTE VIDEO
// =====================================================

function getRemoteVideo(userId) {

    if (remoteVideos[userId]) {

        return remoteVideos[userId];
    }


    const wrapper =
        document.createElement("div");


    const username =
        document.createElement("p");

    username.textContent =
        userId;


    const video =
        document.createElement("video");

    video.autoplay = true;
    video.playsInline = true;
    video.width = 500;


    wrapper.appendChild(
        username
    );

    wrapper.appendChild(
        video
    );


    remoteVideosContainer.appendChild(
        wrapper
    );


    remoteVideos[userId] = {
        wrapper,
        video
    };


    return remoteVideos[userId];
}


// =====================================================
// JSON DATA CHANNEL MESSAGE
// =====================================================

function sendJson(
    channel,
    message
) {

    if (
        channel &&
        channel.readyState === "open"
    ) {

        channel.send(
            JSON.stringify(message)
        );
    }
}


function broadcastJson(message) {

    Object.values(
        dataChannels
    )
        .forEach(
            channel => {

                sendJson(
                    channel,
                    message
                );
            }
        );
}


// =====================================================
// WHITEBOARD FUNCTIONS
// =====================================================

function drawLine(
    x1,
    y1,
    x2,
    y2
) {

    ctx.beginPath();

    ctx.moveTo(
        x1,
        y1
    );

    ctx.lineTo(
        x2,
        y2
    );

    ctx.stroke();

    ctx.closePath();
}


function drawText(
    text,
    x,
    y
) {

    ctx.fillText(
        text,
        x,
        y
    );
}


function clearWhiteboardLocal() {

    ctx.clearRect(
        0,
        0,
        whiteboard.width,
        whiteboard.height
    );
}


function saveWhiteboardEvent(
    event
) {

    if (
        event.type === "wb-clear"
    ) {

        whiteboardHistory = [];

        return;
    }


    whiteboardHistory.push(
        event
    );
}


function applyWhiteboardEvent(
    event,
    save = true
) {

    if (
        event.type === "wb-draw"
    ) {

        drawLine(
            event.x1,
            event.y1,
            event.x2,
            event.y2
        );

    }


    else if (
        event.type === "wb-text"
    ) {

        drawText(
            event.text,
            event.x,
            event.y
        );

    }


    else if (
        event.type === "wb-clear"
    ) {

        clearWhiteboardLocal();

    }


    if (save) {

        saveWhiteboardEvent(
            event
        );
    }
}


function sendWhiteboardState(
    channel
) {

    sendJson(
        channel,
        {
            type:
                "wb-state",

            history:
                whiteboardHistory
        }
    );
}


// =====================================================
// WHITEBOARD POSITION
// =====================================================

function getWhiteboardPosition(
    event
) {

    const rectangle =
        whiteboard.getBoundingClientRect();


    const scaleX =
        whiteboard.width /
        rectangle.width;


    const scaleY =
        whiteboard.height /
        rectangle.height;


    return {

        x:
            (
                event.clientX -
                rectangle.left
            ) * scaleX,

        y:
            (
                event.clientY -
                rectangle.top
            ) * scaleY
    };
}


// =====================================================
// WHITEBOARD DRAW MODE
// =====================================================

drawModeButton.addEventListener(
    "click",
    function () {

        whiteboardMode =
            "draw";


        whiteboardStatus.textContent =
            "Draw mode active.";
    }
);


// =====================================================
// WHITEBOARD WRITE MODE
// =====================================================

textModeButton.addEventListener(
    "click",
    function () {

        whiteboardMode =
            "text";


        whiteboardStatus.textContent =
            "Write mode active. Click on the board.";
    }
);


// =====================================================
// START DRAWING
// =====================================================

whiteboard.addEventListener(
    "pointerdown",
    function (event) {

        if (
            whiteboardMode !==
            "draw"
        ) {

            return;
        }


        drawing = true;


        lastPoint =
            getWhiteboardPosition(
                event
            );


        whiteboard.setPointerCapture(
            event.pointerId
        );
    }
);


// =====================================================
// DRAWING MOVEMENT
// =====================================================

whiteboard.addEventListener(
    "pointermove",
    function (event) {

        if (
            !drawing ||
            !lastPoint ||
            whiteboardMode !== "draw"
        ) {

            return;
        }


        const currentPoint =
            getWhiteboardPosition(
                event
            );


        const whiteboardEvent = {

            type:
                "wb-draw",

            x1:
                lastPoint.x,

            y1:
                lastPoint.y,

            x2:
                currentPoint.x,

            y2:
                currentPoint.y
        };


        applyWhiteboardEvent(
            whiteboardEvent
        );


        broadcastJson(
            whiteboardEvent
        );


        lastPoint =
            currentPoint;
    }
);


function stopDrawing() {

    drawing = false;

    lastPoint = null;
}


whiteboard.addEventListener(
    "pointerup",
    stopDrawing
);


whiteboard.addEventListener(
    "pointercancel",
    stopDrawing
);


// =====================================================
// WHITEBOARD TEXT
// =====================================================

whiteboard.addEventListener(
    "click",
    function (event) {

        if (
            whiteboardMode !==
            "text"
        ) {

            return;
        }


        const position =
            getWhiteboardPosition(
                event
            );


        const text =
            prompt(
                "Write something:"
            );


        if (
            !text ||
            !text.trim()
        ) {

            return;
        }


        const whiteboardEvent = {

            type:
                "wb-text",

            text:
                text.trim(),

            x:
                position.x,

            y:
                position.y
        };


        applyWhiteboardEvent(
            whiteboardEvent
        );


        broadcastJson(
            whiteboardEvent
        );


        whiteboardStatus.textContent =
            "Text added.";
    }
);


// =====================================================
// CLEAR WHITEBOARD FOR BOTH USERS
// =====================================================

clearBoardButton.addEventListener(
    "click",
    function () {

        const clearEvent = {

            type:
                "wb-clear"
        };


        applyWhiteboardEvent(
            clearEvent
        );


        broadcastJson(
            clearEvent
        );


        whiteboardStatus.textContent =
            "Whiteboard cleared.";
    }
);


// =====================================================
// FILE RECEIVING
// =====================================================

function finishReceivedFile(
    userId
) {

    const fileData =
        incomingFiles[userId];


    if (!fileData) {

        return;
    }


    const blob =
        new Blob(
            fileData.chunks,
            {
                type:
                    fileData.mimeType
            }
        );


    const downloadUrl =
        URL.createObjectURL(
            blob
        );


    const wrapper =
        document.createElement(
            "div"
        );


    const message =
        document.createElement(
            "span"
        );

    message.textContent =
        `${userId} sent: `;


    const link =
        document.createElement(
            "a"
        );


    link.href =
        downloadUrl;


    link.download =
        fileData.name;


    link.textContent =
        `Download ${fileData.name}`;


    wrapper.appendChild(
        message
    );

    wrapper.appendChild(
        link
    );


    receivedFiles.appendChild(
        wrapper
    );


    fileStatus.textContent =
        `Received ${fileData.name} successfully.`;


    console.log(
        "File received:",
        fileData.name
    );


    delete incomingFiles[userId];
}


// =====================================================
// DATA CHANNEL MESSAGE HANDLER
// =====================================================

function handleDataChannelMessage(
    userId,
    event
) {

    if (
        typeof event.data ===
        "string"
    ) {

        let message;


        try {

            message =
                JSON.parse(
                    event.data
                );

        }

        catch {

            return;
        }


        if (
            message.type ===
            "file-meta"
        ) {

            incomingFiles[userId] = {

                name:
                    message.name,

                size:
                    message.size,

                mimeType:
                    message.mimeType ||
                    "application/octet-stream",

                chunks: [],

                receivedBytes: 0
            };


            fileStatus.textContent =
                `Receiving ${message.name} from ${userId}...`;


            return;
        }


        if (
            message.type ===
            "file-end"
        ) {

            finishReceivedFile(
                userId
            );

            return;
        }


        if (
            message.type === "wb-draw" ||
            message.type === "wb-text" ||
            message.type === "wb-clear"
        ) {

            applyWhiteboardEvent(
                message
            );

            return;
        }


        if (
            message.type ===
            "wb-state"
        ) {

            if (
                whiteboardHistory.length === 0 &&
                Array.isArray(
                    message.history
                )
            ) {

                clearWhiteboardLocal();


                message.history
                    .forEach(
                        historyEvent => {

                            applyWhiteboardEvent(
                                historyEvent
                            );
                        }
                    );
            }


            return;
        }


        return;
    }


    if (
        event.data instanceof
        ArrayBuffer
    ) {

        const fileData =
            incomingFiles[userId];


        if (!fileData) {

            return;
        }


        fileData.chunks.push(
            event.data
        );


        fileData.receivedBytes +=
            event.data.byteLength;


        console.log(
            "Receiving:",
            fileData.receivedBytes,
            "/",
            fileData.size
        );
    }
}


// =====================================================
// SETUP DATA CHANNEL
// =====================================================

function setupDataChannel(
    userId,
    channel
) {

    dataChannels[userId] =
        channel;


    channel.binaryType =
        "arraybuffer";


    channel.onopen =
        () => {

            console.log(
                "Collaboration channel opened with:",
                userId
            );


            sendWhiteboardState(
                channel
            );
        };


    channel.onclose =
        () => {

            console.log(
                "Channel closed with:",
                userId
            );


            delete dataChannels[userId];
        };


    channel.onerror =
        error => {

            console.error(
                "DataChannel error:",
                error
            );
        };


    channel.onmessage =
        event => {

            handleDataChannelMessage(
                userId,
                event
            );
        };
}


// =====================================================
// FILE BACKPRESSURE
// =====================================================

async function waitForChannelBuffer(
    channel
) {

    if (
        channel.bufferedAmount <
        256 * 1024
    ) {

        return;
    }


    channel.bufferedAmountLowThreshold =
        64 * 1024;


    await new Promise(
        resolve => {

            const listener =
                () => {

                    channel.removeEventListener(
                        "bufferedamountlow",
                        listener
                    );


                    resolve();
                };


            channel.addEventListener(
                "bufferedamountlow",
                listener
            );
        }
    );
}


// =====================================================
// SEND ONE FILE
// =====================================================

async function sendFileToChannel(
    channel,
    file
) {

    const chunkSize =
        16 * 1024;


    sendJson(
        channel,
        {
            type:
                "file-meta",

            name:
                file.name,

            size:
                file.size,

            mimeType:
                file.type
        }
    );


    let offset = 0;


    while (
        offset <
        file.size
    ) {

        await waitForChannelBuffer(
            channel
        );


        const chunk =
            file.slice(
                offset,
                offset + chunkSize
            );


        const buffer =
            await chunk.arrayBuffer();


        channel.send(
            buffer
        );


        offset +=
            buffer.byteLength;


        fileStatus.textContent =
            `Sending ${file.name}: ${
                Math.round(
                    offset /
                    file.size *
                    100
                )
            }%`;
    }


    sendJson(
        channel,
        {
            type:
                "file-end"
        }
    );
}


// =====================================================
// SEND FILE BUTTON
// =====================================================

sendFileButton.addEventListener(
    "click",
    async function () {

        const file =
            fileInput.files[0];


        if (!file) {

            fileStatus.textContent =
                "Please choose a file first.";

            return;
        }


        const openChannels =
            Object.entries(
                dataChannels
            )
                .filter(
                    ([userId, channel]) =>

                        channel.readyState ===
                        "open"
                );


        if (
            openChannels.length === 0
        ) {

            fileStatus.textContent =
                "No connected users.";

            return;
        }


        sendFileButton.disabled =
            true;


        try {

            for (
                const [userId, channel]
                of openChannels
            ) {

                await sendFileToChannel(
                    channel,
                    file
                );


                console.log(
                    "File sent to:",
                    userId
                );
            }


            fileStatus.textContent =
                "File sent successfully.";


            fileInput.value =
                "";

        }

        catch (error) {

            console.error(
                "File send error:",
                error
            );


            fileStatus.textContent =
                "File sending failed.";

        }

        finally {

            sendFileButton.disabled =
                false;
        }
    }
);


// =====================================================
// PEER CONNECTION
// =====================================================

function createPeerConnection(
    userId
) {

    if (
        peerConnections[userId]
    ) {

        return peerConnections[userId];
    }


    const peerConnection =
        new RTCPeerConnection(
            servers
        );


    peerConnections[userId] =
        peerConnection;


    pendingCandidates[userId] =
        [];


    const outgoingStream =
        new MediaStream();


    localStream
        .getAudioTracks()
        .forEach(
            track => {

                outgoingStream.addTrack(
                    track
                );
            }
        );


    const outgoingVideoTrack =

        screenStream
            ? screenStream
                .getVideoTracks()[0]

            : localStream
                .getVideoTracks()[0];


    if (outgoingVideoTrack) {

        outgoingStream.addTrack(
            outgoingVideoTrack
        );
    }


    outgoingStream
        .getTracks()
        .forEach(
            track => {

                peerConnection.addTrack(
                    track,
                    outgoingStream
                );
            }
        );


    peerConnection.ontrack =
        event => {

            console.log(
                "Remote media received from:",
                userId
            );


            if (
                event.streams.length === 0
            ) {

                return;
            }


            const remoteVideo =
                getRemoteVideo(
                    userId
                );


            remoteVideo.video.srcObject =
                event.streams[0];
        };


    peerConnection.onconnectionstatechange =
        () => {

            console.log(
                `${userId} connection state:`,
                peerConnection.connectionState
            );
        };


    console.log(
        "Peer connection created for:",
        userId
    );


    return peerConnection;
}


// =====================================================
// PAIR ID
// =====================================================

function getPairId(
    userA,
    userB
) {

    return [
        userA,
        userB
    ]
        .sort()
        .join("__");
}


// =====================================================
// ICE CANDIDATES
// =====================================================

async function addRemoteCandidate(
    userId,
    candidateData
) {

    const peerConnection =
        peerConnections[userId];


    if (!peerConnection) {

        return;
    }


    const candidate =
        new RTCIceCandidate(
            candidateData
        );


    if (
        peerConnection.remoteDescription &&
        peerConnection.remoteDescription.type
    ) {

        await peerConnection.addIceCandidate(
            candidate
        );

    }

    else {

        pendingCandidates[userId].push(
            candidate
        );
    }
}


async function flushPendingCandidates(
    userId
) {

    const peerConnection =
        peerConnections[userId];


    const candidates =
        pendingCandidates[userId] || [];


    for (
        const candidate
        of candidates
    ) {

        await peerConnection.addIceCandidate(
            candidate
        );
    }


    pendingCandidates[userId] =
        [];
}


// =====================================================
// FIREBASE ICE EXCHANGE
// =====================================================

function attachCandidateExchange(
    remoteUserId,
    peerConnection,
    signalRef,
    callId
) {

    const candidatesRef =
        collection(
            signalRef,
            `candidates_${callId}`
        );


    peerConnection.onicecandidate =
        async event => {

            if (
                !event.candidate
            ) {

                return;
            }


            await addDoc(
                candidatesRef,
                {

                    sender:
                        currentUserId,

                    candidate:
                        event.candidate.toJSON()
                }
            );
        };


    candidateUnsubscribers[remoteUserId] =
        onSnapshot(
            candidatesRef,

            snapshot => {

                snapshot
                    .docChanges()
                    .forEach(
                        async change => {

                            if (
                                change.type !==
                                "added"
                            ) {

                                return;
                            }


                            const data =
                                change.doc.data();


                            if (
                                data.sender ===
                                currentUserId
                            ) {

                                return;
                            }


                            await addRemoteCandidate(
                                remoteUserId,
                                data.candidate
                            );
                        }
                    );
            }
        );
}


// =====================================================
// OFFER CREATOR
// =====================================================

async function startInitiator(
    remoteUserId
) {

    console.log(
        "Starting offer for:",
        remoteUserId
    );


    const peerConnection =
        createPeerConnection(
            remoteUserId
        );


    const collaborationChannel =
        peerConnection.createDataChannel(
            "collaboration"
        );


    setupDataChannel(
        remoteUserId,
        collaborationChannel
    );


    const pairId =
        getPairId(
            currentUserId,
            remoteUserId
        );


    const signalRef =
        doc(
            db,
            "rooms",
            roomCode,
            "signals",
            pairId
        );


    const callId =
        crypto.randomUUID();


    activeCallIds[remoteUserId] =
        callId;


    attachCandidateExchange(
        remoteUserId,
        peerConnection,
        signalRef,
        callId
    );


    const offer =
        await peerConnection.createOffer();


    await peerConnection.setLocalDescription(
        offer
    );


    await setDoc(
        signalRef,
        {

            callId:
                callId,

            userA:
                currentUserId,

            userB:
                remoteUserId,

            offer: {

                type:
                    offer.type,

                sdp:
                    offer.sdp
            },

            answer:
                null,

            updatedAt:
                serverTimestamp()
        }
    );


    console.log(
        "WebRTC offer saved to Firebase."
    );


    signalUnsubscribers[remoteUserId] =
        onSnapshot(
            signalRef,

            async snapshot => {

                if (
                    !snapshot.exists()
                ) {

                    return;
                }


                const data =
                    snapshot.data();


                if (
                    data.callId !==
                    callId
                ) {

                    return;
                }


                if (
                    data.answer &&
                    !peerConnection.currentRemoteDescription
                ) {

                    console.log(
                        "Answer received from:",
                        remoteUserId
                    );


                    await peerConnection
                        .setRemoteDescription(
                            data.answer
                        );


                    await flushPendingCandidates(
                        remoteUserId
                    );
                }
            }
        );
}


// =====================================================
// ANSWER CREATOR
// =====================================================

function startResponder(
    remoteUserId
) {

    console.log(
        "Waiting for offer from:",
        remoteUserId
    );


    const peerConnection =
        createPeerConnection(
            remoteUserId
        );


    peerConnection.ondatachannel =
        event => {

            console.log(
                "Collaboration channel received from:",
                remoteUserId
            );


            setupDataChannel(
                remoteUserId,
                event.channel
            );
        };


    const pairId =
        getPairId(
            currentUserId,
            remoteUserId
        );


    const signalRef =
        doc(
            db,
            "rooms",
            roomCode,
            "signals",
            pairId
        );


    signalUnsubscribers[remoteUserId] =
        onSnapshot(
            signalRef,

            async snapshot => {

                if (
                    !snapshot.exists()
                ) {

                    return;
                }


                const data =
                    snapshot.data();


                if (
                    !data.offer
                ) {

                    return;
                }


                const callId =
                    data.callId;


                if (
                    activeCallIds[remoteUserId] ===
                    callId
                ) {

                    return;
                }


                activeCallIds[remoteUserId] =
                    callId;


                console.log(
                    "Offer received from:",
                    remoteUserId
                );


                attachCandidateExchange(
                    remoteUserId,
                    peerConnection,
                    signalRef,
                    callId
                );


                await peerConnection
                    .setRemoteDescription(
                        data.offer
                    );


                await flushPendingCandidates(
                    remoteUserId
                );


                const answer =
                    await peerConnection.createAnswer();


                await peerConnection
                    .setLocalDescription(
                        answer
                    );


                await setDoc(
                    signalRef,
                    {

                        answer: {

                            type:
                                answer.type,

                            sdp:
                                answer.sdp
                        },

                        updatedAt:
                            serverTimestamp()
                    },

                    {
                        merge: true
                    }
                );


                console.log(
                    "WebRTC answer saved to Firebase."
                );
            }
        );
}


// =====================================================
// CONNECT USERS
// =====================================================

function connectToUser(
    remoteUserId
) {

    if (
        peerConnections[
            remoteUserId
        ]
    ) {

        return;
    }


    if (
        currentUserId.localeCompare(
            remoteUserId
        ) < 0
    ) {

        startInitiator(
            remoteUserId
        );

    }

    else {

        startResponder(
            remoteUserId
        );
    }
}


// =====================================================
// REMOVE USER
// =====================================================

function removeRemoteUser(
    userId
) {

    if (
        dataChannels[userId]
    ) {

        dataChannels[userId].close();

        delete dataChannels[userId];
    }


    if (
        peerConnections[userId]
    ) {

        peerConnections[userId].close();

        delete peerConnections[userId];
    }


    if (
        remoteVideos[userId]
    ) {

        remoteVideos[userId]
            .wrapper
            .remove();


        delete remoteVideos[userId];
    }


    if (
        signalUnsubscribers[
            userId
        ]
    ) {

        signalUnsubscribers[
            userId
        ]();


        delete signalUnsubscribers[
            userId
        ];
    }


    if (
        candidateUnsubscribers[
            userId
        ]
    ) {

        candidateUnsubscribers[
            userId
        ]();


        delete candidateUnsubscribers[
            userId
        ];
    }


    delete activeCallIds[
        userId
    ];

    delete pendingCandidates[
        userId
    ];

    delete incomingFiles[
        userId
    ];


    console.log(
        "Remote user removed:",
        userId
    );
}


// =====================================================
// FIREBASE TEST
// =====================================================

async function testFirebaseConnection() {

    try {

        await getDocs(
            collection(
                db,
                "connection_test"
            )
        );


        console.log(
            "Firebase connected successfully."
        );

    }

    catch (error) {

        console.error(
            "Firebase connection error:",
            error
        );
    }
}


// =====================================================
// REGISTER USER IN ROOM
// =====================================================

async function registerCurrentUser() {

    const userRef =
        doc(
            db,
            "rooms",
            roomCode,
            "participants",
            currentUserId
        );


    await setDoc(
        userRef,
        {

            username:
                currentUserId,

            joinedAt:
                serverTimestamp()
        }
    );


    console.log(
        "User registered in room:",
        currentUserId
    );
}


// =====================================================
// DETECT OTHER USERS
// =====================================================

function listenForParticipants() {

    const participantsRef =
        collection(
            db,
            "rooms",
            roomCode,
            "participants"
        );


    onSnapshot(
        participantsRef,

        snapshot => {

            snapshot
                .docChanges()
                .forEach(
                    change => {

                        const userId =
                            change.doc.id;


                        if (
                            userId ===
                            currentUserId
                        ) {

                            return;
                        }


                        if (
                            change.type ===
                            "added"
                        ) {

                            console.log(
                                "Remote user detected:",
                                userId
                            );


                            connectToUser(
                                userId
                            );
                        }


                        if (
                            change.type ===
                            "removed"
                        ) {

                            removeRemoteUser(
                                userId
                            );
                        }
                    }
                );
        }
    );
}


// =====================================================
// LEAVE ROOM
// =====================================================

window.addEventListener(
    "beforeunload",
    () => {

        const userRef =
            doc(
                db,
                "rooms",
                roomCode,
                "participants",
                currentUserId
            );


        deleteDoc(
            userRef
        );


        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );
        }
    }
);


// =====================================================
// START APPLICATION
// =====================================================

async function startApplication() {

    await firebaseAuthReady;

    console.log(
        "Firebase Auth ready for room."
    );


    await testFirebaseConnection();


    await startCamera();


    if (!localStream) {

        return;
    }


    await registerCurrentUser();


    listenForParticipants();
}


startApplication();