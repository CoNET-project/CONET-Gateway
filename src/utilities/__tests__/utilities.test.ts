import { getGreeting } from '../utilities'

describe('utilities', () => {

    describe('greet', () => {

        it('should greet a given name', () => {
            expect(getGreeting({ name: 'John' })).toEqual('HELLO JOHN')
        })

        it('should greet the world if a name is not given', () => {
            expect(getGreeting()).toEqual('HELLO WORLD')
        })
    })
})
