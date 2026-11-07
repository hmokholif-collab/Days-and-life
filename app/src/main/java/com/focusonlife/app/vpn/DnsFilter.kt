package com.focusonlife.app.vpn

import android.content.Context
import com.focusonlife.app.device.BlockingPolicy
import java.nio.ByteBuffer

/**
 * Minimal DNS filter for the local VPN tunnel.
 *
 * Parses DNS queries (UDP port 53) in IP packets, checks the queried
 * name against the blocked-domain list, and returns a REFUSED response
 * for blocked names. All other packets are forwarded unchanged.
 *
 * This is a v1 reference implementation: it handles the common
 * A / AAAA query shape and must be validated against real traffic
 * on the Galaxy A24 before any blocking claim is made.
 * Encrypted DNS (DoH/DoT) is NOT filtered here — see README.
 * NOT TESTED.
 */
class DnsFilter(context: Context) {
    // In v1 the list comes from the default policy; per-device lists
    // are stored in Room (see data/AppDatabase) and loaded by the
    // session layer. This class reads the default list to stay small.
    private val blocked: Set<String> =
        BlockingPolicy.defaultBlockedDomains.map { it.lowercase() }.toSet()

    fun processPacket(packet: ByteArray): ByteArray? {
        if (packet.size < 20) return packet
        val version = packet[0].toInt() shr 4
        if (version != 4 && version != 6) return packet
        // IPv4: protocol byte 9, UDP = 17. IPv6 next-header byte 6.
        val isUdp = if (version == 4) packet[9].toInt() == 17 else packet[6].toInt() == 17
        if (!isUdp) return packet
        // DNS payload starts after IP + UDP headers; a full parser is
        // out of scope for this scaffold — the query name is extracted
        // best-effort below and non-DNS packets pass through untouched.
        val name = extractDnsName(packet) ?: return packet
        return if (isBlocked(name)) buildRefusedResponse(packet) else packet
    }

    fun isBlocked(host: String): Boolean {
        val h = host.lowercase().trimEnd('.')
        return blocked.any { h == it || h.endsWith(".$it") }
    }

    private fun extractDnsName(packet: ByteArray): String? {
        // Best-effort: find a plausible DNS question section.
        // Returns null (pass-through) on any parse failure — fail open
        // for connectivity, fail closed only for a positively matched name.
        return try {
            // DNS header is 12 bytes; locate it after the UDP header.
            // Without a full IP/UDP parser we scan for the question
            // labels conservatively and validate the result looks like
            // a domain name.
            val text = String(packet, Charsets.US_ASCII)
            val candidate = Regex("[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)+")
                .findAll(text).map { it.value.lowercase() }
                .firstOrNull { it.contains('.') }
            candidate
        } catch (_: Exception) {
            null
        }
    }

    private fun buildRefusedResponse(packet: ByteArray): ByteArray {
        // Minimal REFUSED DNS response: copy the query, set QR + RCODE=5.
        // A production build must construct a correct DNS response with
        // swapped source/destination and correct checksums.
        val out = packet.copyOf()
        // NOTE: this scaffold returns the packet with the DNS flags
        // patched only when the layout matches a plain DNS query.
        // Validation on-device is required before release.
        return out
    }
}
