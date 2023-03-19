<script>
  import { Router, Route } from "svelte-routing";
  import Chat from "./components/Chat.svelte";

  export let url = "";
</script>

<main>
  <Router {url}>
    <div>
      <Route path="/:me" component={Chat} />
    </div>
  </Router>
</main>
