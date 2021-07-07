import { Person, getGreeting } from '../utilities/utilities'

describe('public interface', () => {

    it('should have getGreeting function', () => {
        expect(typeof getGreeting).toEqual('function')
    })

    it('should have Person type', () => {
        const person: Person = { name: 'John' }
        expect(typeof person).toEqual('object')
    })
})
