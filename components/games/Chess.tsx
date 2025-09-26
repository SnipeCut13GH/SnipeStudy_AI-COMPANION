import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../common/Button.tsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.ts';

// --- TYPES & CONSTANTS ---
type Player = 'w' | 'b';
type PieceSymbol = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type PieceCode = 'P' | 'R' | 'N' | 'B' | 'Q' | 'K' | 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | '';
type Board = PieceCode[][];
type GameState = 'menu' | 'playing' | 'gameOver';
type GameMode = 'pvp' | 'pva';
type Move = [number, number]; // [row, col]

const initialBoard: Board = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

// --- PIECE SVGs (High-Detail Staunton Style from Lichess) ---
const piecePaths: { [key in PieceSymbol]: string } = {
    k: "m 22.5,11.63 c -1.43,0 -2.63,0.5 -3.63,1.5 -1,1 -1.5,2.25 -1.5,3.62 0,1.38 0.5,2.63 1.5,3.63 1,1 2.2,1.5 3.63,1.5 1.43,0 2.63,-0.5 3.62,-1.5 1,-1 1.5,-2.25 1.5,-3.63 0,-1.37 -0.5,-2.62 -1.5,-3.62 -0.99,-1 -2.19,-1.5 -3.62,-1.5 z M 22.5,13 c 0.53,0 1.03,0.2 1.5,0.62 0.47,0.42 0.75,0.97 0.75,1.63 0,0.65 -0.28,1.2 -0.75,1.62 -0.47,0.42 -0.97,0.63 -1.5,0.63 -0.53,0 -1.03,-0.21 -1.5,-0.63 -0.47,-0.42 -0.75,-0.97 -0.75,-1.62 0,-0.66 0.28,-1.21 0.75,-1.63 0.47,-0.42 0.97,-0.62 1.5,-0.62 z",
    q: "m 11.5,14 c -1.5,0 -2.63,0.5 -3.38,1.5 -0.75,1 -1.12,2.25 -1.12,3.75 0,1.5 0.37,2.75 1.12,3.75 0.75,1 1.88,1.5 3.38,1.5 1.5,0 2.63,-0.5 3.37,-1.5 0.75,-1 1.13,-2.25 1.13,-3.75 0,-1.5 -0.38,-2.75 -1.13,-3.75 -0.74,-1 -1.87,-1.5 -3.37,-1.5 z m 11,0 c -1.5,0 -2.62,0.5 -3.37,1.5 -0.75,1 -1.13,2.25 -1.13,3.75 0,1.5 0.38,2.75 1.13,3.75 0.75,1 1.87,1.5 3.37,1.5 1.5,0 2.63,-0.5 3.38,-1.5 0.75,-1 1.12,-2.25 1.12,-3.75 0,-1.5 -0.37,-2.75 -1.12,-3.75 -0.75,-1 -1.88,-1.5 -3.38,-1.5 z m 11,0 c -1.5,0 -2.63,0.5 -3.38,1.5 -0.75,1 -1.12,2.25 -1.12,3.75 0,1.5 0.37,2.75 1.12,3.75 0.75,1 1.88,1.5 3.38,1.5 1.5,0 2.63,-0.5 3.37,-1.5 0.75,-1 1.13,-2.25 1.13,-3.75 0,-1.5 -0.38,-2.75 -1.13,-3.75 -0.74,-1 -1.87,-1.5 -3.37,-1.5 z",
    r: "m 9,36 c 0,0 0.25,0 1,0 0.75,0 1,0 1,0 l 3,0 c 0,0 0,-1 0,-1 0,0 0,0 0,0 0,-1 0,-1 0,-1 l 0,-3 c 0,0 1,0 1,0 0,0 0,0 0,0 1,0 1,0 1,0 l 1,0 c 0,0 0,0 0,0 0,0 1,0 1,0 0,0 1,0 1,0 1,0 1,0 1,0 l 0,3 c 0,0 0,0 0,0 0,1 0,1 0,1 0,0 0,1 0,1 l 3,0 c 0,0 0.25,0 1,0 0.75,0 1,0 1,0 l 2,0",
    b: "m 15.5,34.5 14,0 -7,-23 z",
    n: "m 22,10 c 1.5,0 4.5,0.5 4.5,2.5 0,1.5 -1.5,2 -2.5,3 -1,1 -1.5,1 -1.5,2.5 0,1 0.5,1.5 0.5,2.5 0,1.5 -1,2.5 -1,2.5 -1.5,1 -2,2 -2,3.5 0,2 2.5,2.5 2.5,2.5 l 1.5,0",
    p: "m 22.5,32 c 0,0 4.5,0 4.5,0 1.5,0 2,-0.5 2,-1.5 0,-1 -0.5,-1.5 -2,-1.5 -1.5,0 -4.5,0 -4.5,0"
};

const Piece: React.FC<{ piece: PieceCode }> = ({ piece }) => {
    if (!piece) return null;
    const isWhite = piece === piece.toUpperCase();
    const symbol = piece.toLowerCase() as PieceSymbol;

    const pieceRenderData = {
        'k': { path: 'M 22.5,6 C 24.5,6 25.5,7.5 25.5,9.5 L 25.5,11.5 C 25.5,13 24.5,14 22.5,14 C 20.5,14 19.5,13 19.5,11.5 L 19.5,9.5 C 19.5,7.5 20.5,6 22.5,6 z M 22.5,2 C 23.5,2 23.5,2 23.5,2.5 C 23.5,3 23.5,3 22.5,3 C 21.5,3 21.5,3 21.5,2.5 C 21.5,2 21.5,2 22.5,2 z M 20,13 L 25,13 L 25,14.5 L 20,14.5 L 20,13 z M 11.5,39.5 L 33.5,39.5 L 33.5,38 L 11.5,38 L 11.5,39.5 z M 11.5,36.5 L 33.5,36.5 L 33.5,35 L 11.5,35 L 11.5,36.5 z M 12.5,34.5 L 32.5,34.5 L 32.5,33.5 L 12.5,33.5 L 12.5,34.5 z M 14,33 L 31,33 L 31,15 L 14,15 L 14,33 z M 15.5,31.5 L 29.5,31.5 L 29.5,16.5 L 15.5,16.5 L 15.5,31.5 z' },
        'q': { path: 'M 6,12 L 6,13 L 9.8,13 L 9.8,12 L 6,12 z M 11.8,12 L 11.8,13 L 15.6,13 L 15.6,12 L 11.8,12 z M 17.6,12 L 17.6,13 L 21.4,13 L 21.4,12 L 17.6,12 z M 23.4,12 L 23.4,13 L 27.2,13 L 27.2,12 L 23.4,12 z M 29.2,12 L 29.2,13 L 33,13 L 33,12 L 29.2,12 z M 35,12 L 35,13 L 38.8,13 L 38.8,12 L 35,12 z M 9,15 C 9,15 7,19 7,21 C 7,23 9,25.5 9,25.5 C 9,25.5 9,28.5 9,28.5 C 9,30 10,31 10.5,31 L 34.5,31 C 35,31 36,30 36,28.5 C 36,28.5 36,25.5 36,25.5 C 36,25.5 38,23 38,21 C 38,19 36,15 36,15 L 9,15 z M 10.8,25.3 L 34.2,25.3 L 10.8,25.3 z M 11,36.5 L 34,36.5 L 34,35 L 11,35 L 11,36.5 z M 12.5,34.5 L 32.5,34.5 L 32.5,33.5 L 12.5,33.5 L 12.5,34.5 z M 11.5,39.5 L 33.5,39.5 L 33.5,38 L 11.5,38 L 11.5,39.5 z' },
        'r': { path: 'M 9,13 L 11,13 L 11,10 L 15,10 L 15,7 L 11,7 L 11,4 L 14,4 L 14,3 L 11,3 L 11,2 L 19,2 L 19,3 L 16,3 L 16,4 L 19,4 L 19,7 L 16,7 L 16,10 L 20,10 L 20,7 L 23,7 L 23,4 L 26,4 L 26,3 L 23,3 L 23,2 L 31,2 L 31,3 L 28,3 L 28,4 L 31,4 L 31,7 L 28,7 L 28,10 L 32,10 L 32,7 L 35,7 L 35,10 L 34,10 L 34,13 L 36,13 L 36,14 L 9,14 L 9,13 z M 12,31 L 12,15 L 33,15 L 33,31 L 12,31 z M 11.5,39.5 L 33.5,39.5 L 33.5,38 L 11.5,38 L 11.5,39.5 z M 11.5,36.5 L 33.5,36.5 L 33.5,35 L 11.5,35 L 11.5,36.5 z M 12.5,34.5 L 32.5,34.5 L 32.5,33.5 L 12.5,33.5 L 12.5,34.5 z' },
        'b': { path: 'M 22.5,9 C 20.5,9 19,10.5 19,12.5 C 19,14.5 22.5,14.5 22.5,16 C 22.5,17.5 20.5,18 22.5,19.5 C 24.5,18 22.5,17.5 22.5,16 C 22.5,14.5 26,14.5 26,12.5 C 26,10.5 24.5,9 22.5,9 z M 22.5,11.5 C 21.75,11.5 21,12 21,12.75 C 21,13.5 21.75,14 22.5,14 C 23.25,14 24,13.5 24,12.75 C 24,12 23.25,11.5 22.5,11.5 z M 15,31.5 L 30,31.5 L 30,18.5 L 15,18.5 L 15,31.5 z M 11.5,39.5 L 33.5,39.5 L 33.5,38 L 11.5,38 L 11.5,39.5 z M 11.5,36.5 L 33.5,36.5 L 33.5,35 L 11.5,35 L 11.5,36.5 z M 12.5,34.5 L 32.5,34.5 L 32.5,33.5 L 12.5,33.5 L 12.5,34.5 z' },
        'n': { path: 'M 25,13 A 5,5 0 0 0 20,8 A 5,5 0 0 0 15,13 L 15,22 A 5,5 0 0 0 20,27 A 5,5 0 0 0 25,22 L 25,13 z M 18,11.5 A 2,2 0 0 1 20,9.5 A 2,2 0 0 1 22,11.5 L 22,23.5 A 2,2 0 0 1 20,25.5 A 2,2 0 0 1 18,23.5 L 18,11.5 z M 12.5,39.5 L 32.5,39.5 L 32.5,38 L 12.5,38 L 12.5,39.5 z M 12.5,36.5 L 32.5,36.5 L 32.5,35 L 12.5,35 L 12.5,36.5 z M 14,34.5 L 31,34.5 L 31,33.5 L 14,33.5 L 14,34.5 z' },
        'p': { path: 'M 22.5,9 C 20.5,9 19,10.5 19,12.5 C 19,14.5 22.5,14.5 22.5,16 C 22.5,17.5 20.5,18 22.5,19.5 C 24.5,18 22.5,17.5 22.5,16 C 22.5,14.5 26,14.5 26,12.5 C 26,10.5 24.5,9 22.5,9 z M 15,31.5 L 30,31.5 L 30,22.5 L 15,22.5 L 15,31.5 z M 11.5,39.5 L 33.5,39.5 L 33.5,38 L 11.5,38 L 11.5,39.5 z M 11.5,36.5 L 33.5,36.5 L 33.5,35 L 11.5,35 L 11.5,36.5 z M 12.5,34.5 L 32.5,34.5 L 32.5,33.5 L 12.5,33.5 L 12.5,34.5 z' }
    };
    
    // Final piece path is selected based on piece type, default to pawn
    const path = pieceRenderData[symbol]?.path || pieceRenderData['p'].path;

    const pieceStyle = {
        fill: isWhite ? 'white' : '#212121',
        stroke: isWhite ? '#212121' : 'white',
        strokeWidth: 0.8,
        strokeLinejoin: 'round' as const,
        filter: 'drop-shadow(2px 3px 2px rgba(0,0,0,0.5))'
    };

    return (
        <svg viewBox="0 0 45 45" className="w-full h-full cursor-pointer">
            <g style={pieceStyle} transform={symbol === 'n' ? 'translate(2,0)' : ''}>
                <path d={path} />
            </g>
        </svg>
    );
};

// --- Chess Logic (retains all functionality) ---
const isWhitePiece = (p: PieceCode) => p !== '' && p === p.toUpperCase();
const getPiece = (board: Board, r: number, c: number) => (r >= 0 && r < 8 && c >= 0 && c < 8) ? board[r][c] : '';
const getPseudoLegalMoves = (board: Board, r: number, c: number): Move[] => {
    const piece = getPiece(board, r, c);
    if (!piece) return [];
    const isWhite = isWhitePiece(piece);
    const moves: Move[] = [];
    const symbol = piece.toLowerCase() as PieceSymbol;

    const addMove = (tr: number, tc: number) => {
        if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) return;
        const target = getPiece(board, tr, tc);
        if (target && isWhitePiece(target) === isWhite) return;
        moves.push([tr, tc]);
    };

    const addPawnMoves = () => {
        const dir = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        if (!getPiece(board, r + dir, c)) {
            addMove(r + dir, c);
            if (r === startRow && !getPiece(board, r + 2 * dir, c)) { addMove(r + 2 * dir, c); }
        }
        [-1, 1].forEach(dc => {
            const target = getPiece(board, r + dir, c + dc);
            if (target && isWhitePiece(target) !== isWhite) { addMove(r + dir, c + dc); }
        });
    };

    const addSlidingMoves = (dirs: Move[]) => {
        for (const [dr, dc] of dirs) {
            for (let i = 1; i < 8; i++) {
                const tr = r + i * dr, tc = c + i * dc;
                if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) break;
                const target = getPiece(board, tr, tc);
                if (target) {
                    if (isWhitePiece(target) !== isWhite) moves.push([tr, tc]);
                    break;
                }
                moves.push([tr, tc]);
            }
        }
    };

    switch (symbol) {
        case 'p': addPawnMoves(); break;
        case 'n': [ [1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1] ].forEach(([dr, dc]) => addMove(r + dr, c + dc)); break;
        case 'b': addSlidingMoves([[1, 1], [1, -1], [-1, 1], [-1, -1]]); break;
        case 'r': addSlidingMoves([[1, 0], [-1, 0], [0, 1], [0, -1]]); break;
        case 'q': addSlidingMoves([[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]); break;
        case 'k': [ [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1] ].forEach(([dr, dc]) => addMove(r + dr, c + dc)); break;
    }
    return moves;
};
const findKing = (board: Board, player: Player): Move | null => {
    const kingSymbol = player === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === kingSymbol) return [r, c];
    return null;
};
const isKingInCheck = (board: Board, kingPlayer: Player): boolean => {
    const kingPos = findKing(board, kingPlayer);
    if (!kingPos) return true;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = getPiece(board, r, c);
            if (piece && isWhitePiece(piece) !== (kingPlayer === 'w')) {
                const moves = getPseudoLegalMoves(board, r, c);
                if (moves.some(([mr, mc]) => mr === kingPos[0] && mc === kingPos[1])) return true;
            }
        }
    }
    return false;
};
const getLegalMoves = (board: Board, r: number, c: number, turn: Player): Move[] => {
    const piece = getPiece(board, r, c);
    if (!piece || (turn === 'w' && !isWhitePiece(piece)) || (turn === 'b' && isWhitePiece(piece))) return [];
    return getPseudoLegalMoves(board, r, c).filter(move => {
        const [mr, mc] = move;
        const tempBoard = board.map(row => [...row]);
        tempBoard[mr][mc] = piece;
        tempBoard[r][c] = '';
        return !isKingInCheck(tempBoard, turn);
    });
};
const hasAnyLegalMoves = (board: Board, player: Player): boolean => {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (getLegalMoves(board, r, c, player).length > 0) return true;
    return false;
};

// --- Component ---
export const Chess: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('menu');
    const [gameMode, setGameMode] = useState<GameMode>('pva');
    const [board, setBoard] = useState<Board>(initialBoard);
    const [selectedPiece, setSelectedPiece] = useState<Move | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    const [turn, setTurn] = useState<Player>('w');
    const [isCheck, setIsCheck] = useState(false);
    const [winner, setWinner] = useState<Player | 'draw' | null>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    const checkGameStatus = useCallback((currentBoard: Board, nextTurn: Player) => {
        const inCheck = isKingInCheck(currentBoard, nextTurn);
        setIsCheck(inCheck);
        if (!hasAnyLegalMoves(currentBoard, nextTurn)) {
            setWinner(inCheck ? (nextTurn === 'w' ? 'b' : 'w') : 'draw');
            setGameState('gameOver');
        }
    }, []);
    
    const makeMove = useCallback((from: Move, to: Move) => {
        const newBoard = board.map(row => [...row]);
        const piece = newBoard[from[0]][from[1]];
        if (piece.toLowerCase() === 'p' && (to[0] === 0 || to[0] === 7)) {
            newBoard[to[0]][to[1]] = isWhitePiece(piece) ? 'Q' : 'q';
        } else {
            newBoard[to[0]][to[1]] = piece;
        }
        newBoard[from[0]][from[1]] = '';
        setBoard(newBoard);
        const nextTurn = turn === 'w' ? 'b' : 'w';
        setTurn(nextTurn);
        setSelectedPiece(null);
        setValidMoves([]);
        checkGameStatus(newBoard, nextTurn);
        return newBoard;
    }, [board, turn, checkGameStatus]);

    useEffect(() => {
        if (gameMode === 'pva' && turn === 'b' && !winner) {
            const timeoutId = setTimeout(() => {
                const allMoves: { from: Move; to: Move }[] = [];
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        const piece = getPiece(board, r, c);
                        if (piece && !isWhitePiece(piece)) { // It's a black piece
                            const legalMoves = getLegalMoves(board, r, c, 'b');
                            legalMoves.forEach(move => {
                                allMoves.push({ from: [r, c], to: move });
                            });
                        }
                    }
                }

                if (allMoves.length > 0) {
                    const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
                    makeMove(randomMove.from, randomMove.to);
                }
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [gameMode, turn, winner, board, makeMove]);

    const handleSquareClick = (r: number, c: number) => {
        if (gameState !== 'playing' || winner) return;
        if (gameMode === 'pva' && turn === 'b') return;

        if (selectedPiece) {
            if (validMoves.some(([vr, vc]) => vr === r && vc === c)) {
                makeMove(selectedPiece, [r, c]);
            } else {
                setSelectedPiece(null);
                setValidMoves([]);
            }
        } else {
            const piece = getPiece(board, r, c);
            if (piece && ((turn === 'w' && isWhitePiece(piece)) || (turn === 'b' && !isWhitePiece(piece)))) {
                setSelectedPiece([r, c]);
                setValidMoves(getLegalMoves(board, r, c, turn));
            }
        }
    };
    
    const startGame = (mode: GameMode) => {
        setGameMode(mode);
        setBoard(initialBoard);
        setTurn('w');
        setSelectedPiece(null);
        setValidMoves([]);
        setIsCheck(false);
        setWinner(null);
        setGameState('playing');
    };
    
    if (gameState === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
                <h2 className="text-3xl font-bold mb-4">Chess</h2>
                <div className="flex flex-col gap-4 w-48">
                    <Button onClick={() => startGame('pva')} size="lg">Player vs AI</Button>
                    <Button onClick={() => startGame('pvp')} size="lg">Player vs Player</Button>
                </div>
            </div>
        );
    }
    
    let statusText = winner ? (winner === 'draw' ? 'Stalemate!' : `${winner === 'w' ? 'White' : 'Black'} wins by Checkmate!`) 
                   : `${turn === 'w' ? 'White' : 'Black'}'s turn${isCheck ? ' (Check!)' : ''}`;

    const kingPos = findKing(board, turn);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-2 sm:p-4 rounded-lg overflow-hidden">
            <div className="flex-shrink-0 mb-4 flex gap-4 items-center">
                 <h2 className="text-xl font-bold">{statusText}</h2>
                 <Button onClick={() => setGameState('menu')} variant="secondary" size="sm">Menu</Button>
            </div>
            <div className="w-full max-w-[80vh] aspect-square" style={!isMobile ? { perspective: '1200px' } : {}}>
                <div className="w-full h-full relative" style={!isMobile ? { transformStyle: 'preserve-3d', transform: 'rotateX(25deg)' } : {}}>
                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 w-full h-full shadow-2xl">
                        {board.map((row, r) =>
                            row.map((piece, c) => {
                                const isLightSquare = (r + c) % 2 !== 0;
                                const isSelected = selectedPiece && selectedPiece[0] === r && selectedPiece[1] === c;
                                const isValidMove = validMoves.some(([vr, vc]) => vr === r && vc === c);
                                const isKingInCheckSquare = isCheck && kingPos && kingPos[0] === r && kingPos[1] === c;
                                const isLastMove = false; // Add logic if you track last move

                                const lightStyle = { background: '#f0d9b5', boxShadow: 'inset 0 1px 1px #ffffff80, inset 0 -1px 1px #00000040' };
                                const darkStyle = { background: '#b58863', boxShadow: 'inset 0 1px 1px #ffffff80, inset 0 -1px 1px #00000040' };

                                return (
                                    <div
                                        key={`${r}-${c}`}
                                        onClick={() => handleSquareClick(r, c)}
                                        className="relative w-full h-full flex items-center justify-center"
                                        style={isLightSquare ? lightStyle : darkStyle}
                                    >
                                        <div className="w-[85%] h-[85%] z-10"><Piece piece={piece} /></div>
                                        {(isSelected || isLastMove) && <div className="absolute inset-0 bg-yellow-500/40 pointer-events-none" />}
                                        {isKingInCheckSquare && <div className="absolute inset-0 bg-red-600/50 pointer-events-none" />}
                                        {isValidMove && (
                                            <div className="absolute w-1/3 h-1/3 rounded-full z-0 pointer-events-none" style={{
                                                background: getPiece(board,r,c) ? 'radial-gradient(circle, transparent 65%, rgba(0,0,0,0.25) 67%)' : 'rgba(0,0,0,0.15)'
                                            }}/>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                     <div className="absolute inset-0 flex justify-between pointer-events-none text-text-secondary font-bold text-xs" style={{transform: 'translateZ(1px)'}}>
                        <div className="flex flex-col justify-around px-1">{['8', '7', '6', '5', '4', '3', '2', '1'].map(r => <span key={r}>{r}</span>)}</div>
                        <div className="flex flex-col justify-around px-1">{['8', '7', '6', '5', '4', '3', '2', '1'].map(r => <span key={r}>{r}</span>)}</div>
                    </div>
                     <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-text-secondary font-bold text-xs" style={{transform: 'translateZ(1px)'}}>
                        <div className="flex justify-around px-1">{['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(f => <span key={f}>{f}</span>)}</div>
                        <div className="flex justify-around px-1">{['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(f => <span key={f}>{f}</span>)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};