export function hello(name = 'YoutubeThreads') {
  return `Hello from ${name}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(hello());
}
