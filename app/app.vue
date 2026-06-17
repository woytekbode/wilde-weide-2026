<template>
  <!-- scroll-body=false: overlays vergrendelen scroll zonder padding-right op
       <body> te zetten. Onze scrollbar-gutter (stable, in main.css) houdt de
       layout al stabiel; de compensatie zou juist een sprong naar links geven
       en de gutter naast de modal tonen. -->
  <UApp :scroll-body="false">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
