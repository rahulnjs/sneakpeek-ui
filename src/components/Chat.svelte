<script>
  import { onMount } from "svelte";
  import { peer, connection } from "../store";
  import http from "../http";
  import moment from "moment";
  import { slide } from "svelte/transition";

  export let me;
  let you;

  let messages = [];
  let userMsg = "";
  let msgBeingTyped = "";
  let lastTypingSignalAt;
  let isTyping = false;
  let connected = false;
  let targetUser = "";
  let roomId;
  let allRoomsData;
  let tryingToConnect = false;
  let heartbeatTimer;
  let retryConnectToSlaveTimer;
  let showUserListOnMobile = false;

  onMount(async () => {
    http.get(`/chat/room/${me}`).then((d) => {
      allRoomsData = d;
    });
    init();
  });

  async function init() {
    if (typeof Peer === "function") {
      const _peer = new Peer();

      _peer.on("connection", (conn) => {
        tryingToConnect = true;
        conn.on("open", async function () {
          tryingToConnect = false;
          console.log("connected as slave");
          const connectionFrom = conn.peer;
          const d = await http.get(`/id/${connectionFrom}`);
          you = d.you;
          connected = true;
          saveRoom();
        });
        conn.on("data", handleMesage);
        conn.on("close", () => {
          connected = false;
          console.log("Closed I am slave");
        });
        conn.on("error", (e) => console.log("Error slave", e));
        connection.set(conn);
      });

      _peer.on("open", async (id) => {
        peer.set(_peer);
        const d = await http.put(`/me/${me}`, {
          id: _peer.id,
          now: Date.now(),
        });
        heartbeatTimer = setInterval(heartbeat, 2500);
        console.log(d.id);

        if (you && me !== "@rahul") {
          connectToSlave();
        }
      });
    }
  }

  async function heartbeat() {
    if ($peer.id) {
      await http.put(`/me/${me}`, {
        id: $peer.id,
        now: Date.now(),
      });
    } else {
      init();
    }
  }

  async function connectToSlave() {
    tryingToConnect = true;
    const d = await http.get(`/you/${you}`);
    if (d && d.id) {
      const conn = $peer.connect(d.id, {
        reliable: true,
      });
      conn.on("open", function () {
        connected = true;
        targetUser = "";
        console.log("connected as master");
        tryingToConnect = false;
        saveRoom();
      });
      conn.on("data", handleMesage);
      conn.on("close", () => {
        connected = false;
        console.log("Closed I am master");
        setTimeout(connectToSlave, 3000);
      });
      conn.on("error", (e) => console.log("Error master", e));
      connection.set(conn);
    } else {
      //user not online keep trying or fallback to ws
      tryingToConnect = false;
      console.log("User not online"); //keep trying
      setTimeout(connectToSlave, 3000);
      connected = false;
      retryConnectToSlaveTimer = setTimeout(connectToSlave, 3000);
    }
  }

  function handleMesage(data) {
    const msg = JSON.parse(data);
    scrollToBottom();
    if (msg.type === "Sent") {
      messages = [...messages, JSON.parse(data)];
      msgBeingTyped = "";
    } else {
      msgBeingTyped = msg.body;
      lastTypingSignalAt = Date.now();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      var objDiv = document.getElementById("messages");
      objDiv.scrollTop = objDiv.scrollHeight + 150;
    }, 100);
  }

  setInterval(checkIfTyping, 400);

  function checkIfTyping() {
    if (!lastTypingSignalAt) {
      return;
    } else {
      isTyping = !(Date.now() - lastTypingSignalAt > 1500);
    }
  }

  function send(e) {
    const isEnter = e && e.key === "Enter";
    const msgPayload = {
      body: userMsg,
      at: Date.now(),
      by: me,
      type: !isEnter ? "Typing" : "Sent",
      roomId,
    };
    try {
      $connection.send(JSON.stringify(msgPayload));
      if (isEnter) {
        messages = [...messages, msgPayload];
        userMsg = "";
        http.post(`/chat/message`, msgPayload).then((r) => r);
      }
    } finally {
    }
  }

  function connect() {
    you = targetUser;
    messages = [];
    connectToSlave();
  }

  async function saveRoom() {
    const d = await http.post(`/chat/room`, { p1: me, p2: you });
    roomId = d._id;
    const ms = await http.get(`/chat/message/${d._id}`);
    messages = ms;
    scrollToBottom();
  }

  const getOtherPeersName = (room) => (room.p1 === me ? room.p2 : room.p1);

  function connectToPeer(user) {
    you = user;
    messages = [];
    connectToSlave();
  }
</script>

<div>
  <div class="app-header">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="logo">
      <img
        src="/sneakpeek.png"
        alt="Logo"
        on:click={() => (showUserListOnMobile = true)}
        style="cursor: pointer"
      />
      <span id="sneakpeek-text">Sneakpeek</span>
    </div>
    <div class="header-actions">
      <div class="chat-connector">
        <div>
          <input placeholder="Enter @username" bind:value={targetUser} />
        </div>
        <div>
          <button on:click={connect}
            ><i class="fa-solid fa-plug" /> Connect</button
          >
        </div>
      </div>
    </div>
  </div>
  <div class="main-app">
    <div class="left-side gen-side">
      <div class="users">
        {#if allRoomsData && allRoomsData.length > 0}
          {#each allRoomsData as room}
            <div
              class="user-info"
              on:click={() => connectToPeer(getOtherPeersName(room))}
              on:keyup={() => {}}
            >
              <div class="user-ico">
                <i class="fa-regular fa-user" />
              </div>
              <div class="user-msg">
                <div class="username">{getOtherPeersName(room)}</div>
                <div class="msgbody">
                  {#if room.lastMsg}
                    {#if room.lastMsg.by === me}
                      You:
                    {/if}
                    {room.lastMsg.body}
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="empty-user-list">
            <div class="empty-user-list--icon">
              <i class="fa-solid fa-users-line" />
            </div>

            <div class="empty-user-list--desc">
              Your chats will appear here.
            </div>
          </div>
        {/if}
      </div>
    </div>
    {#if you}
      <div class="right-side gen-side">
        <div class="user-header">
          <div class="user-info">
            <div class="user-ico">
              <i class="fa-regular fa-user" />
              <div class="user-status {connected ? 'online' : 'offline'}">
                <i class="fa-solid fa-circle" />
              </div>
            </div>
            <div class="user-name">
              <div>{you}</div>
              <div class="typing-indicator">
                {#if isTyping}
                  Typing...
                {/if}
              </div>
            </div>
          </div>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="user-action">
            <i class="fa-solid fa-ellipsis-vertical" />
          </div>
        </div>
        <div class="messages" id="messages">
          {#each messages as msg}
            <div class="-msg {msg.by === me ? 'outgoing' : 'incoming'}">
              <div class="message-wrapper">
                <div class="message">
                  {msg.body}
                </div>
                <div class="msg-time">
                  {moment(msg.at).format("hh:mm a")}
                </div>
              </div>
            </div>
          {/each}
          {#if msgBeingTyped}
            <div class="-msg incoming">
              <div class="message-wrapper">
                <div class="message">{msgBeingTyped}</div>
              </div>
            </div>
          {/if}
        </div>
        <div class="action">
          <div class="input-area">
            <input
              placeholder="Type a message"
              bind:value={userMsg}
              on:keyup={send}
            />
            <div class="emoji">
              <i class="fa-regular fa-face-smile" />
            </div>
            <div class="attachment">
              <i class="fa-solid fa-paperclip" />
            </div>
          </div>
          <div class="send-btn">
            <button on:click={() => send({ key: "Enter" })}
              ><i class="fa-solid fa-paper-plane" /></button
            >
          </div>
        </div>
      </div>
    {:else if tryingToConnect}
      <div class="no-chat-window">Connecting</div>
    {:else}
      <div class="no-chat-window">
        <div class="no-chat-window--icon">
          <i class="fa-solid fa-message" />
        </div>
        <div class="no-chat-window--desc">
          Select a chat or <b><i class="fa-solid fa-plug" /> Connect</b> to a new
          user
        </div>
      </div>
    {/if}
  </div>
  {#if showUserListOnMobile}
    <div class="user-list-mobile" transition:slide>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="user-list-mobile--close-btn"
        on:click={() => (showUserListOnMobile = false)}
      >
        <i class="fa-solid fa-xmark" />
      </div>
      <div class="users">
        {#if allRoomsData && allRoomsData.length > 0}
          {#each allRoomsData as room}
            <div
              class="user-info"
              on:click={() => connectToPeer(getOtherPeersName(room))}
              on:keyup={() => {}}
            >
              <div class="user-ico">
                <i class="fa-regular fa-user" />
              </div>
              <div class="user-msg">
                <div class="username">{getOtherPeersName(room)}</div>
                <div class="msgbody">
                  {#if room.lastMsg}
                    {#if room.lastMsg.by === me}
                      You:
                    {/if}
                    {room.lastMsg.body}
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="empty-user-list">
            <div class="empty-user-list--icon">
              <i class="fa-solid fa-users-line" />
            </div>

            <div class="empty-user-list--desc">
              Your chats will appear here.
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .main-app {
    padding: 24px;
    display: grid;
    gap: 20px;
    grid-template-columns: 1fr 3fr;
    height: calc(100vh - 82px);
    box-sizing: border-box;
    position: relative;
  }

  .gen-side {
    background-color: #fff;
    border-radius: 16px;
    padding: 16px;
    box-sizing: border-box;
  }

  .left-side {
    padding: 0px 16px !important;
    overflow: auto;
    height: calc(100vh - 130px);
  }

  .right-side .messages {
    height: calc(100vh - 288px);
    overflow-y: auto;
  }

  .right-side .messages .-msg {
    display: flex;
  }

  .right-side .messages .incoming {
    justify-content: left;
  }

  .right-side .messages .outgoing {
    justify-content: right;
  }

  .right-side .messages .message-wrapper {
    max-width: 80%;
    margin: 10px 0px;
    font-size: 0.9rem;
  }

  .right-side .messages .message-wrapper .message {
    padding: 16px;
    border-radius: 20px;
    font-size: 0.9rem;
  }

  .right-side .incoming .message-wrapper .message {
    background-color: #f5f7fb;
    border-top-left-radius: 0px;
    color: #7d7f80;
  }

  .right-side .outgoing .message-wrapper .message {
    background-color: #4d426d;
    border-top-right-radius: 0px;
    color: #efeef1;
  }

  .right-side .messages .message-wrapper .msg-time {
    margin-top: 6px;
    font-size: 0.7rem;
    color: gray;
  }

  .right-side .incoming .message-wrapper .msg-time {
    text-align: left;
  }

  .right-side .outgoing .message-wrapper .msg-time {
    text-align: right;
  }

  .right-side .action {
    height: 70px;
    display: flex;
    gap: 10px;
    box-sizing: border-box;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding-top: 28px;
  }

  .right-side .action .input-area {
    flex-grow: 1;
    position: relative;
  }

  .right-side .action .input-area .emoji {
    position: absolute;
    top: 15px;
    left: 12px;
  }

  .right-side .action .input-area .attachment {
    position: absolute;
    top: 15px;
    right: 12px;
  }

  input {
    border: none;
    background-color: #f5f7fb;
    border-radius: 24px;
    resize: none;
    outline: none;
    padding: 5px 0px;
    padding-left: 35px;
    padding-right: 35px;
    width: 100%;
    line-height: 36px;
  }

  .right-side .action .send-btn {
    margin-top: 0px;
  }

  button {
    border: none;
    background-color: #3aa58b;
    color: #fff;
    border-radius: 50%;
    padding: 13px 12px 11px 12px;
    cursor: pointer;
  }

  .user-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f1f3;
  }

  .users .user-info {
    padding: 16px 0px;
    border-bottom: 1px solid #f0f1f3;
    cursor: pointer;
  }

  .users .user-info:hover {
    color: #848484 !important;
  }

  .users .user-info:last-child {
    border-bottom: none;
  }

  .users .user-info:first-child {
    border-radius: 16px 16px 0px 0px;
  }

  .user-info {
    display: flex;
    gap: 12px;
    align-items: center;
    position: relative;
  }

  .user-info .user-name {
    font-weight: 400;
  }

  .user-info .user-ico {
    background-color: #f5f7fb;
    border-radius: 30px;
    padding: 10px 12px;
    position: relative;
  }

  .user-msg .username {
    font-weight: 400;
  }

  .user-msg .msgbody {
    font-size: 0.8rem;
    color: #7d7f80;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .typing-indicator {
    margin-top: 5px;
    font-size: 0.7rem;
    color: gray;
  }

  .user-status {
    position: absolute;
    font-size: 0.6rem;
    left: 28px;
    bottom: 0px;
    padding: 2px;
    background-color: #fff;
    border-radius: 10px;
  }

  .online {
    color: #3aa58b;
  }

  .offline {
    color: #e1eafb;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 0px 16px;
  }

  .app-header .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #cccccc;
    font-size: 1.9rem;
    font-weight: 700;
    filter: grayscale(1);
  }

  .app-header .logo img {
    width: 48px;
  }

  .chat-connector {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .chat-connector input {
    background-color: #fff;
    padding: 0px 15px;
    line-height: 48px;
  }

  .chat-connector button {
    border-radius: 24px;
    padding-left: 20px;
    padding-right: 20px;
    min-width: 125px;
  }

  .header-actions {
    margin-top: 10px;
  }

  .empty-user-list,
  .no-chat-window {
    display: flex;
    height: calc(100vh - 150px);
    align-items: center;
    flex-direction: column;
    justify-content: center;
    color: #d6d6d6;
    text-align: justify;
  }

  .empty-user-list--icon {
    font-size: 3rem;
    color: #ededed;
  }

  .empty-user-list--desc {
    text-align: justify;
    font-size: 0.8rem;
    letter-spacing: -1px;
  }

  .no-chat-window--icon {
    font-size: 5rem;
    color: #ededed;
  }

  @media only screen and (max-width: 600px) {
    #sneakpeek-text {
      display: none;
    }

    .left-side {
      position: absolute;
      display: none;
    }

    .main-app {
      grid-template-columns: 4fr;
    }

    .app-header .logo {
      padding-right: 15px;
    }

    .user-list-mobile {
      position: fixed;
      bottom: 0;
      background-color: #fff;
      width: 100vw;
      padding: 16px;
      border-top: 1px solid whitesmoke;
      box-sizing: border-box;
    }

    .user-list-mobile .users {
      height: calc(100vh - 400px);
      overflow: auto;
    }

    .user-list-mobile--close-btn {
      position: absolute;
      top: 6px;
      right: 9px;
      cursor: pointer;
    }
  }
</style>
