import React from 'react'

const colors = {
    main: '#B58CFF',
    shadow: '#7045B8',
    highlight: '#DCC8FF',
}


const Scribbler = () => {
    return (
        <div className="w-full h-screen bg-amber-600 flex justify-center items-center">
            {/* Button */}
            <div
                style={{ backgroundColor: colors.shadow }}
                className="
                    relative z-2
                    w-[200px] h-[200px]
                    rounded-[50%]
                    overflow-visible
                "
            >
                {/* Main face */}
                <div
                    style={{ backgroundColor: colors.main }}
                    className="
                        absolute
                        bottom-10 left-0
                        w-full h-full
                        rounded-[10%]
                        overflow-hidden
                        border-4
                        border-[#B58CFF]
                    "
                >
                    {/* Directional top highlight */}
                    {/* Inset the top half gloss */}
                </div>
            </div>
        </div>
    )
}

export default Scribbler