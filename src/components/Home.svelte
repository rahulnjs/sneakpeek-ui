<script>
  import { navigate } from "svelte-routing";
  import http from "../http";
  let username;
  let loading = false;

  async function enter() {
    loading = true;
    const d = await http.get(`/user/${username}`);
    if (d.valid) {
      navigate(`/${username}`);
    } else {
      Toastify({
        text: `User ${username} is not authorized.`,
        className: "warning",
      }).showToast();
    }
  }
</script>

<main>
  <div class="app">
    <div style="text-align: center;">
      <div class="sneakpeek-logo">
        <img src="/sneakpeek.png" alt="Logo" />
      </div>
      <div class="hero-text">Welcome to <b>Sneakpeek</b></div>
      <div class="sub-hero-text">
        A realest time chat application, that allows you to see what the other
        user is typing as they are typing.
      </div>
      <div class="header-actions" style="margin-top: 25px;">
        <div class="chat-connector">
          <div>
            <input
              placeholder="Your @username"
              bind:value={username}
              on:keyup={(e) =>
                e.key === "Enter" && username.length > 0 && enter()}
            />
          </div>
          <div>
            <button on:click={enter}
              ><i class="fa-solid fa-check" /> Enter</button
            >
          </div>
        </div>
      </div>
      <div class="disclaimer">
        * <b>Sneakpeek</b> alpha is open for some selective users only.
      </div>
    </div>
  </div>
</main>

<style>
  .app {
    display: flex;
    height: 100vh;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 24px;
  }

  .sneakpeek-logo img {
    width: 128px;
  }

  .hero-text {
    font-size: 4rem;
    color: #a1a1a1;
    letter-spacing: -4px;
    line-height: 60px;
  }

  .sub-hero-text {
    margin: 20px 0px 10px 0px;
    font-size: 1rem;
    color: #a1a1a1;
    letter-spacing: -1px;
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
    background-color: #fff;
    padding: 0px 15px;
    line-height: 48px;
  }
  button {
    border: none;
    background-color: #3aa58b;
    color: #fff;
    border-radius: 50%;
    padding: 13px 12px 11px 12px;
    cursor: pointer;
    border-radius: 24px;
    padding-left: 20px;
    padding-right: 20px;
    min-width: 125px;
  }

  .chat-connector {
    display: flex;
    align-items: center;
    gap: 15px;
    justify-content: center;
  }

  .disclaimer {
    margin-top: 25px;
    color: #cfcfcf;
  }
</style>
