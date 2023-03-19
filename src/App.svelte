<script>
  import { Router, Route } from "svelte-routing";
  import Chat from "./components/Chat.svelte";
  import Home from "./components/Home.svelte";

  export let url = "";
</script>

<Router {url}>
  <Route path="/">
    <Home />
  </Route>
  <Route path="/:me" component={Chat} />
</Router>
