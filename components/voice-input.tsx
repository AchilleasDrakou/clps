"use client"

import React from "react"
import { Mic } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

interface VoiceInputProps {
  onStart?: () => void
  onStop?: () => void
  className?: string
}

export function VoiceInput({
  className,
  onStart,
  onStop,
}: VoiceInputProps) {
  const [listening, setListening] = React.useState(false)
  const [time, setTime] = React.useState(0)

  React.useEffect(() => {
    if (!listening) {
      onStop?.()
      setTime(0)
      return
    }
    onStart?.()
    const id = setInterval(() => setTime((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [listening, onStart, onStop])

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className={`flex flex-col items-center justify-center ${className ?? ""}`}>
      <motion.div
        className="flex p-2 border border-white/[0.1] items-center justify-center rounded-full cursor-pointer hover:bg-white/[0.03] transition-colors"
        layout
        transition={{
          layout: {
            duration: 0.4,
          },
        }}
        onClick={() => setListening((v) => !v)}
      >
        <div className="h-6 w-6 items-center justify-center flex">
          {listening ? (
            <motion.div
              className="w-4 h-4 bg-white rounded-sm"
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <Mic size={16} className="text-gray-400" />
          )}
        </div>
        <AnimatePresence mode="wait">
          {listening && (
            <motion.div
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden flex gap-2 items-center justify-center"
            >
              <div className="flex gap-0.5 items-center justify-center">
                {Array.from({ length: 12 }, (_, i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 bg-white rounded-full"
                    initial={{ height: 2 }}
                    animate={{ height: [2, 3 + Math.random() * 10, 3 + Math.random() * 5, 2] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.05, ease: "easeInOut" }}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500 w-10 text-center">
                {formatTime(time)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
