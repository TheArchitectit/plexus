
import LLMServer from '@musistudio/llms';
try {
  const instance = new LLMServer();
  console.log('Instance:', instance);
  console.log('Prototype:', Object.getPrototypeOf(instance));
} catch (e) {
  console.log('Error instantiating:', e);
}
