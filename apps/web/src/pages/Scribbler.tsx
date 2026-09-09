import React from 'react'

const colors = {
    main: '#B58CFF',
    shadow: '#7045B8',
    highlight: '#DCC8FF',
}


const Scribbler = () => {
    return (
        <div className="w-full h-screen bg-amber-600 flex justify-center items-center">
            {/* Padded Border View */}
            {/* Outer shell */}
            <div className="border-2 border-dashed border-purple-700 p-2 w-[200px] rounded-[32px] aspect-square">
                <div className="w-full h-full bg-purple-700 border-inherit rounded-[30px]"></div>
            </div>
        </div>
    )
}

export default Scribbler