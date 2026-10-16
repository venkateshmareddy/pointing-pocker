import assert from 'node:assert/strict';

const room = `smoke-${Date.now()}`;
const url = `ws://127.0.0.1:1999/parties/main/${room}`;
const ids = {
  moderator: '11111111-1111-4111-8111-111111111111',
  spectator: '22222222-2222-4222-8222-222222222222',
};

function client() {
  const socket = new WebSocket(url);
  const messages = [];
  const waiters = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    messages.push(message);
    for (const waiter of [...waiters]) {
      if (waiter.predicate(message)) {
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      }
    }
  });
  const waitFor = (predicate, timeout = 3000) => {
    const found = messages.find(predicate);
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve };
      waiters.push(waiter);
      setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(new Error('Timed out waiting for WebSocket message'));
      }, timeout);
    });
  };
  return { socket, messages, waitFor, send: (value) => socket.send(JSON.stringify(value)) };
}

const moderator = client();
await new Promise((resolve, reject) => {
  moderator.socket.addEventListener('open', resolve, { once: true });
  moderator.socket.addEventListener('error', reject, { once: true });
});
await moderator.waitFor((m) => m.type === 'state');
moderator.send({ type: 'join', displayName: 'Moderator', role: 'voter', persistentId: ids.moderator });
const moderatorState = await moderator.waitFor((m) => m.type === 'state' && m.yourId === ids.moderator);
assert.equal(moderatorState.state.participants[ids.moderator].role, 'moderator');
assert.equal(moderatorState.state.room.deckType, 'powers-of-2');

moderator.send({ type: 'set-deck', deckType: 'tshirt' });
await moderator.waitFor((m) => m.type === 'deck-updated');
moderator.send({ type: 'vote', value: 8 });
assert.equal((await moderator.waitFor((m) => m.type === 'error')).message, 'That card is not in the current deck');
moderator.send({ type: 'vote', value: 'M' });
await moderator.waitFor((m) => m.type === 'vote-cast');

const hidden = await fetch(`http://127.0.0.1:1999/parties/main/${room}?peek=true`).then((r) => r.json());
assert.equal(hidden.voters[0].vote, 'hidden');
assert.equal(hidden.stats, null);

moderator.send({ type: 'set-story', title: 'Next story' });
await moderator.waitFor((m) => m.type === 'story-updated');
moderator.send({ type: 'reveal' });
const reveal = await moderator.waitFor((m) => m.type === 'votes-revealed');
assert.equal(reveal.votes[ids.moderator], null);

const spectator = client();
await new Promise((resolve) => spectator.socket.addEventListener('open', resolve, { once: true }));
await spectator.waitFor((m) => m.type === 'state');
spectator.send({ type: 'join', displayName: 'Viewer', role: 'spectator', persistentId: ids.spectator });
await spectator.waitFor((m) => m.type === 'state' && m.yourId === ids.spectator);
spectator.send({ type: 'vote', value: 'M' });
assert.equal((await spectator.waitFor((m) => m.type === 'error')).message, 'Only voters can vote');

const duplicate = client();
await new Promise((resolve) => duplicate.socket.addEventListener('open', resolve, { once: true }));
await duplicate.waitFor((m) => m.type === 'state');
duplicate.send({ type: 'join', displayName: 'Moderator', role: 'voter', persistentId: ids.moderator });
await duplicate.waitFor((m) => m.type === 'state' && m.yourId === ids.moderator);
duplicate.socket.close();
await new Promise((resolve) => setTimeout(resolve, 100));
moderator.send({ type: 'clear' });
await moderator.waitFor((m) => m.type === 'votes-cleared');

moderator.send({ type: 'start-timer', seconds: 1 });
await moderator.waitFor((m) => m.type === 'timer-started' && m.seconds === 1);
await moderator.waitFor((m) => m.type === 'timer-stopped', 4000);

moderator.send({ type: 'kick', participantId: ids.spectator });
await spectator.waitFor((m) => m.type === 'kicked');
await moderator.waitFor((m) => m.type === 'participant-left' && m.id === ids.spectator);
const afterKick = await fetch(`http://127.0.0.1:1999/parties/main/${room}`).then((r) => r.json());
assert.equal(afterKick.spectators.length, 0);

moderator.socket.close();
spectator.socket.close();
console.log('WebSocket smoke checks passed');
