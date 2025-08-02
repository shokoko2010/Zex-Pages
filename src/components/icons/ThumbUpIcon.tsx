import React from 'react';

const ThumbUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21H3v-7a2 2 0 012-2h1.732a5 5 0 00.707-2.828L7 7m14 0a2 2 0 10-4 0m4 0a2 2 0 11-4 0m-9 8a2 2 0 01-2-2V7m5.464-1.868A2 2 0 0112 5.696V6l.682 1.705L9.53 9H13v10m4-10h4" />
    </svg>
);

export default ThumbUpIcon;
