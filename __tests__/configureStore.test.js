
import configureStore from '../configureStore';

describe('configureStore', () => {
    it('can create a new store', () => {
        let cs = configureStore();
        console.log(cs);
    });

    it('can create a new store', () => {
        let cs = configureStore({ items: { ['test']: true } });
        console.log(cs);
    });
});