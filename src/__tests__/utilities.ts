export type Person = {
    name: string
}

export const getGreeting = (
    person?: Person
) => {
    const name = person?.name || 'world'

    return `HELLO ${name.toUpperCase()}`
}
