<slot />

<script lang="ts">
  import '$lib/app/styles.css';
  import {authorizationStore} from '$lib/auth';
  import {onMount} from 'svelte';

  // PROPS =================================================================================================================================
  export let data;

  // VARS =================================================================================================================================
  onMount(() => ($authorizationStore = data.bearer ? {Authorization: data.bearer} : undefined));
</script>
