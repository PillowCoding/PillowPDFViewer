export default function generateGuid()
{
    const generateNext = () => {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    // Return id of format 'aaaaaaaa'-'aaaa'-'aaaa'-'aaaa'-'aaaaaaaaaaaa'.
    return generateNext() + generateNext() + '-' + generateNext() + '-' + generateNext() + '-' + generateNext() + '-' + generateNext() + generateNext() + generateNext();
}